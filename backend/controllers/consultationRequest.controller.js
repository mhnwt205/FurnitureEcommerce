import jwt from 'jsonwebtoken';
import prisma from '../prismaClient.js';
import { z } from 'zod';
import { createNotification } from '../services/notification.service.js';
import {
  sendConsultationAdminNotificationEmail,
  sendConsultationConfirmationEmail
} from '../utils/emailService.js';

const ALLOWED_STATUSES = ['new', 'contacted', 'consulting', 'completed', 'cancelled'];

const emptyToUndefined = (value) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string' && value.trim() === '') return undefined;
  return value;
};

const optionalTrimmedString = (max) => z.preprocess(
  emptyToUndefined,
  z.string().trim().max(max).optional()
);

const optionalEmail = z.preprocess(
  emptyToUndefined,
  z.string().trim().email().max(255).optional()
);

const createConsultationRequestSchema = z.object({
  fullName: z.string().trim().min(1).max(255),
  phone: z.string().trim().min(1).max(20),
  email: optionalEmail,
  projectType: optionalTrimmedString(100),
  roomType: optionalTrimmedString(100),
  budgetRange: optionalTrimmedString(100),
  preferredContact: optionalTrimmedString(100),
  message: optionalTrimmedString(3000),
  source: optionalTrimmedString(100),
  website: optionalTrimmedString(255),
  companyWebsite: optionalTrimmedString(255)
});

const adminQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  status: z.enum(['all', ...ALLOWED_STATUSES]).optional().default('all'),
  search: z.string().trim().optional().default(''),
  dateFrom: optionalTrimmedString(30),
  dateTo: optionalTrimmedString(30),
  assignedStaffId: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().optional())
});

const statusUpdateSchema = z.object({
  status: z.enum(ALLOWED_STATUSES)
});

const assignSchema = z.object({
  assignedStaffId: z.preprocess((value) => {
    if (value === undefined || value === '' || value === null) return null;
    return value;
  }, z.coerce.number().int().positive().nullable())
});

const noteSchema = z.object({
  internalNote: z.preprocess((value) => {
    if (value === undefined || value === null) return null;
    return value;
  }, z.string().trim().max(3000).nullable())
});

const parseId = (id) => {
  const parsed = Number.parseInt(id, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const generateRequestCode = () => {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `CR-${datePart}-${randomPart}`;
};


const queueConsultationEmails = (request) => {
  const tasks = [];

  if (request.email) {
    tasks.push({
      label: 'customer confirmation',
      run: () => sendConsultationConfirmationEmail(request.email, request)
    });
  }

  const notifyEmail = process.env.CONSULTATION_NOTIFY_EMAIL || process.env.SMTP_USER;
  if (notifyEmail) {
    tasks.push({
      label: 'admin notification',
      run: () => sendConsultationAdminNotificationEmail(notifyEmail, request)
    });
  } else {
    console.warn(`[ConsultationEmail] Admin notification skipped for ${request.requestCode}: missing CONSULTATION_NOTIFY_EMAIL and SMTP_USER`);
  }

  if (!tasks.length) return;

  Promise.allSettled(tasks.map((task) => Promise.resolve().then(task.run)))
    .then((results) => {
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.warn(
            `[ConsultationEmail] Failed to send ${tasks[index].label} for ${request.requestCode}: ${result.reason?.message || 'Unknown email error'}`
          );
        }
      });
    })
    .catch((error) => {
      console.warn(`[ConsultationEmail] Email queue failed for ${request.requestCode}: ${error.message}`);
    });
};
const createUniqueRequestCode = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const requestCode = generateRequestCode();
    const existing = await prisma.consultationRequest.findUnique({
      where: { requestCode },
      select: { id: true }
    });
    if (!existing) return requestCode;
  }

  return `CR-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
};

const getOptionalCustomerId = async (req) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, role: true, isActive: true }
    });

    if (user?.role === 'customer' && user.isActive) return user.id;
  } catch (error) {
    return null;
  }

  return null;
};

const includeBasicRelations = {
  customer: { select: { id: true, fullName: true, email: true, phone: true } },
  assignedStaff: { select: { id: true, fullName: true, email: true, role: true } }
};

const canAccessAdminConsultation = (user, request) => {
  if (user?.role === 'admin') return true;
  return user?.role === 'staff' && request?.assignedStaffId === user.id;
};

const requireAssignedConsultationAccess = async (req, res, id) => {
  const request = await prisma.consultationRequest.findUnique({
    where: { id },
    select: { id: true, assignedStaffId: true }
  });

  if (!request) {
    res.status(404).json({ message: 'Consultation request not found' });
    return null;
  }

  if (!canAccessAdminConsultation(req.user, request)) {
    res.status(403).json({ message: 'Forbidden: Consultation request is not assigned to you' });
    return null;
  }

  return request;
};

export const getConsultationAssignees = async (req, res) => {
  try {
    const assignees = await prisma.user.findMany({
      where: {
        role: { in: ['admin', 'staff'] },
        isActive: true
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        position: true
      },
      orderBy: [
        { fullName: 'asc' },
        { email: 'asc' }
      ]
    });

    res.status(200).json({ assignees });
  } catch (error) {
    console.error('Get consultation assignees error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createConsultationRequest = async (req, res) => {
  try {
    const validatedData = createConsultationRequestSchema.parse(req.body);

    if (validatedData.website || validatedData.companyWebsite) {
      return res.status(200).json({
        message: 'Consultation request received',
        request: null
      });
    }

    const customerId = await getOptionalCustomerId(req);
    const requestCode = await createUniqueRequestCode();

    const request = await prisma.consultationRequest.create({
      data: {
        requestCode,
        customerId,
        fullName: validatedData.fullName,
        phone: validatedData.phone,
        email: validatedData.email || null,
        projectType: validatedData.projectType || null,
        roomType: validatedData.roomType || null,
        budgetRange: validatedData.budgetRange || null,
        preferredContact: validatedData.preferredContact || null,
        message: validatedData.message || null,
        source: validatedData.source || null
      }
    });

    queueConsultationEmails(request);

    res.status(201).json({ message: 'Consultation request created', request });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    console.error('Create consultation request error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMyConsultationRequests = async (req, res) => {
  try {
    const requests = await prisma.consultationRequest.findMany({
      where: { customerId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ requests });
  } catch (error) {
    console.error('Get my consultation requests error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAdminConsultationRequests = async (req, res) => {
  try {
    const { page, limit, status, search, dateFrom, dateTo, assignedStaffId } = adminQuerySchema.parse(req.query);
    const where = {};

    if (status !== 'all') where.status = status;

    if (search) {
      where.OR = [
        { requestCode: { contains: search } },
        { fullName: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
        { message: { contains: search } }
      ];
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        const from = new Date(dateFrom);
        if (Number.isNaN(from.getTime())) return res.status(400).json({ message: 'Invalid dateFrom' });
        where.createdAt.gte = from;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        if (Number.isNaN(to.getTime())) return res.status(400).json({ message: 'Invalid dateTo' });
        to.setHours(23, 59, 59, 999);
        where.createdAt.lte = to;
      }
    }

    if (req.user.role === 'staff') {
      where.assignedStaffId = req.user.id;
    } else if (assignedStaffId) {
      where.assignedStaffId = assignedStaffId;
    }

    const skip = (page - 1) * limit;
    const [total, requests] = await prisma.$transaction([
      prisma.consultationRequest.count({ where }),
      prisma.consultationRequest.findMany({
        where,
        include: includeBasicRelations,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      })
    ]);

    res.status(200).json({
      data: requests,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    console.error('Get admin consultation requests error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAdminConsultationRequestById = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid consultation request ID' });

    const request = await prisma.consultationRequest.findUnique({
      where: { id },
      include: includeBasicRelations
    });

    if (!request) return res.status(404).json({ message: 'Consultation request not found' });
    if (!canAccessAdminConsultation(req.user, request)) {
      return res.status(403).json({ message: 'Forbidden: Consultation request is not assigned to you' });
    }

    res.status(200).json({ request });
  } catch (error) {
    console.error('Get admin consultation request detail error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateConsultationRequestStatus = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid consultation request ID' });

    const { status } = statusUpdateSchema.parse(req.body);
    const accessibleRequest = await requireAssignedConsultationAccess(req, res, id);
    if (!accessibleRequest) return;

    const request = await prisma.consultationRequest.update({
      where: { id },
      data: { status },
      include: includeBasicRelations
    });

    res.status(200).json({ message: 'Consultation request status updated', request });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Consultation request not found' });
    }
    console.error('Update consultation request status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const assignConsultationRequest = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid consultation request ID' });

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Only admin can assign consultation requests' });
    }

    const { assignedStaffId } = assignSchema.parse(req.body);

    if (assignedStaffId) {
      const staff = await prisma.user.findFirst({
        where: { id: assignedStaffId, role: { in: ['admin', 'staff'] }, isActive: true },
        select: { id: true }
      });

      if (!staff) {
        return res.status(400).json({ message: 'assignedStaffId must belong to an active admin or staff user' });
      }
    }

    const existingRequest = await prisma.consultationRequest.findUnique({
      where: { id },
      select: { id: true, assignedStaffId: true }
    });

    if (!existingRequest) {
      return res.status(404).json({ message: 'Consultation request not found' });
    }

    const previousAssignedStaffId = existingRequest.assignedStaffId;
    const request = await prisma.consultationRequest.update({
      where: { id },
      data: { assignedStaffId },
      include: includeBasicRelations
    });

    const shouldNotifyAssignee = Boolean(assignedStaffId)
      && assignedStaffId !== previousAssignedStaffId
      && assignedStaffId !== req.user.id;

    if (shouldNotifyAssignee) {
      createNotification({
        recipientId: assignedStaffId,
        actorId: req.user.id,
        type: 'consultation_assigned',
        module: 'consultation',
        entityType: 'consultation',
        entityId: request.id,
        title: 'Bạn được phân công yêu cầu tư vấn',
        message: `Yêu cầu ${request.requestCode} đã được giao cho bạn xử lý.`,
        metadata: {
          requestCode: request.requestCode,
          status: request.status,
          source: 'consultation_assignment'
        }
      }).catch((error) => {
        console.warn(`Consultation assignment notification failed for ${request.requestCode}: ${error.message}`);
      });
    }

    res.status(200).json({ message: 'Consultation request assigned', request });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Consultation request not found' });
    }
    console.error('Assign consultation request error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateConsultationRequestNote = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid consultation request ID' });

    const { internalNote } = noteSchema.parse(req.body);
    const accessibleRequest = await requireAssignedConsultationAccess(req, res, id);
    if (!accessibleRequest) return;

    const request = await prisma.consultationRequest.update({
      where: { id },
      data: { internalNote },
      include: includeBasicRelations
    });

    res.status(200).json({ message: 'Consultation request note updated', request });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Consultation request not found' });
    }
    console.error('Update consultation request note error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
