import prisma from '../prismaClient.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const toPositiveInt = (value, fieldName) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
  return parsed;
};

const normalizePagination = ({ page = DEFAULT_PAGE, limit = DEFAULT_LIMIT } = {}) => {
  const normalizedPage = Number.parseInt(page, 10);
  const normalizedLimit = Number.parseInt(limit, 10);

  return {
    page: Number.isInteger(normalizedPage) && normalizedPage > 0 ? normalizedPage : DEFAULT_PAGE,
    limit: Number.isInteger(normalizedLimit) && normalizedLimit > 0 ? Math.min(normalizedLimit, MAX_LIMIT) : DEFAULT_LIMIT
  };
};

const serializeMetadata = (metadata) => {
  if (metadata === undefined || metadata === null) return null;
  try {
    return JSON.stringify(metadata);
  } catch (error) {
    throw new Error('metadata must be JSON serializable');
  }
};

const parseMetadata = (metadataJson) => {
  if (!metadataJson) return null;
  try {
    return JSON.parse(metadataJson);
  } catch (error) {
    return null;
  }
};

const formatNotification = (notification) => ({
  ...notification,
  metadata: parseMetadata(notification.metadataJson),
  metadataJson: undefined
});

const validateNotificationPayload = (payload) => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('notification payload is required');
  }

  const recipientId = toPositiveInt(payload.recipientId, 'recipientId');
  const actorId = payload.actorId === undefined || payload.actorId === null || payload.actorId === ''
    ? null
    : toPositiveInt(payload.actorId, 'actorId');

  const requiredTextFields = ['type', 'module', 'title', 'message'];
  requiredTextFields.forEach((field) => {
    if (typeof payload[field] !== 'string' || payload[field].trim() === '') {
      throw new Error(`${field} is required`);
    }
  });

  return {
    recipientId,
    actorId,
    type: payload.type.trim(),
    module: payload.module.trim(),
    entityType: payload.entityType ? String(payload.entityType).trim() : null,
    entityId: payload.entityId === undefined || payload.entityId === null || payload.entityId === '' ? null : toPositiveInt(payload.entityId, 'entityId'),
    title: payload.title.trim(),
    message: payload.message.trim(),
    metadataJson: serializeMetadata(payload.metadata)
  };
};

const ensureRecipientsExist = async (recipientIds) => {
  const uniqueIds = [...new Set(recipientIds)];
  const existingUsers = await prisma.user.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true }
  });
  const existingIds = new Set(existingUsers.map((user) => user.id));
  const missingIds = uniqueIds.filter((id) => !existingIds.has(id));

  if (missingIds.length) {
    throw new Error(`recipientId not found: ${missingIds.join(', ')}`);
  }
};

export const createNotification = async (payload) => {
  const data = validateNotificationPayload(payload);
  await ensureRecipientsExist([data.recipientId]);

  const notification = await prisma.notification.create({
    data,
    include: {
      actor: { select: { id: true, fullName: true, email: true, role: true } }
    }
  });

  return formatNotification(notification);
};

export const createNotificationsBulk = async (list) => {
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('notification list must be a non-empty array');
  }

  const data = list.map(validateNotificationPayload);
  await ensureRecipientsExist(data.map((item) => item.recipientId));

  const result = await prisma.notification.createMany({ data });
  return { count: result.count };
};

export const getUserNotifications = async (userId, { page, limit, unreadOnly } = {}) => {
  const recipientId = toPositiveInt(userId, 'userId');
  const pagination = normalizePagination({ page, limit });
  const where = {
    recipientId,
    ...(unreadOnly ? { readAt: null } : {})
  };

  const [total, notifications] = await prisma.$transaction([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      include: {
        actor: { select: { id: true, fullName: true, email: true, role: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit
    })
  ]);

  return {
    data: notifications.map(formatNotification),
    pagination: {
      ...pagination,
      total,
      totalPages: Math.ceil(total / pagination.limit)
    }
  };
};

export const getUnreadCount = async (userId) => {
  const recipientId = toPositiveInt(userId, 'userId');
  return prisma.notification.count({ where: { recipientId, readAt: null } });
};

export const markAsRead = async (userId, notificationId) => {
  const recipientId = toPositiveInt(userId, 'userId');
  const id = toPositiveInt(notificationId, 'notificationId');
  const now = new Date();

  const result = await prisma.notification.updateMany({
    where: { id, recipientId },
    data: { readAt: now }
  });

  if (result.count === 0) return null;

  const notification = await prisma.notification.findFirst({
    where: { id, recipientId },
    include: {
      actor: { select: { id: true, fullName: true, email: true, role: true } }
    }
  });

  return notification ? formatNotification(notification) : null;
};

export const markAllAsRead = async (userId) => {
  const recipientId = toPositiveInt(userId, 'userId');
  const result = await prisma.notification.updateMany({
    where: { recipientId, readAt: null },
    data: { readAt: new Date() }
  });

  return { count: result.count };
};