import { z } from 'zod';
import prisma from '../prismaClient.js';
import { getRequestId } from '../middlewares/requestContext.middleware.js';
import { createNotification } from '../services/notification.service.js';
import * as vouchers from '../services/voucher.service.js';

const money = z.union([
  z.string().regex(/^\d{1,18}$/),
  z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
]);
const nullableDate = z.coerce.date().nullable().optional();
const audienceType = z.enum(['PUBLIC', 'MINIMUM_TIER', 'POINT_REDEMPTION', 'ADMIN_ASSIGNMENT']);
const minimumTier = z.enum(['BRONZE', 'SILVER', 'GOLD', 'DIAMOND']).nullable().optional();
const definitionFields = {
  code: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().max(4000).nullable().optional(),
  discountType: z.enum(['FIXED_AMOUNT', 'PERCENTAGE']),
  discountValueVnd: money,
  maximumDiscountAmountVnd: money.nullable().optional(),
  minimumOrderAmountVnd: money.nullable().optional(),
  claimStartsAt: nullableDate,
  claimEndsAt: nullableDate,
  fixedExpiresAt: nullableDate,
  validityDaysAfterIssue: z.coerce.number().int().positive().nullable().optional(),
  audienceType,
  minimumTier,
  publicClaimEnabled: z.boolean(),
  isActive: z.boolean().optional()
};
const rewardConfig = z.object({
  pointCost: z.coerce.number().int().positive(),
  inventoryLimit: z.coerce.number().int().nonnegative().nullable().optional(),
  isActive: z.boolean().optional(),
  validityDays: z.coerce.number().int().positive().nullable().optional()
}).strict();
definitionFields.rewardConfig = rewardConfig.optional();
const definitionCreateSchema = z.object(definitionFields).strict();
const definitionUpdateSchema = z.object(definitionFields).partial().strict().refine((value) => Object.keys(value).length > 0, 'PATCH body must not be empty');
const paginationFields = { page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) };
const idSchema = z.coerce.number().int().positive().max(2_147_483_647);
const sourceSchema = z.enum(['PUBLIC_CLAIM', 'ADMIN_ASSIGNMENT', 'TIER_REWARD', 'POINT_REDEMPTION']);

const requestId = getRequestId;
const sendError = (req, res, err) => {
  const isValidation = err instanceof z.ZodError;
  const isBusinessError = err instanceof vouchers.VoucherError;
  const status = isBusinessError ? err.status : (isValidation ? 400 : 500);
  const code = isBusinessError ? err.code : (isValidation ? 'VALIDATION_ERROR' : 'INTERNAL_SERVER_ERROR');
  const details = isValidation
    ? { fields: err.issues.reduce((fields, issue) => ({ ...fields, [issue.path.join('.') || 'request']: [...(fields[issue.path.join('.') || 'request'] || []), issue.message] }), {}) }
    : err?.details;
  res.status(status).json({ error: { code, message: isValidation ? 'Request validation failed' : (isBusinessError ? err.message : 'Internal server error'), ...(details ? { details } : {}) }, requestId: requestId(req) });
};
const parseId = (value) => idSchema.parse(value);
const requireCustomer = (req) => {
  if (req.user?.role !== 'customer') throw new vouchers.VoucherError('FORBIDDEN', 'Customer access is required', 403);
};
const notifyAfterCommit = (payload) => {
  createNotification(payload).catch((error) => console.error('Voucher notification failed', { code: error?.code, name: error?.name }));
};

export const listDefinitions = async (req, res) => {
  try {
    const query = z.object({
      ...paginationFields,
      search: z.string().trim().min(1).max(255).optional(),
      isActive: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
      publicClaimEnabled: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
      discountType: z.enum(['FIXED_AMOUNT', 'PERCENTAGE']).optional(),
      audienceType: audienceType.optional(),
      sortBy: z.enum(['code', 'name', 'isActive', 'publicClaimEnabled', 'claimStartsAt', 'createdAt', 'updatedAt']).optional(),
      sortOrder: z.enum(['asc', 'desc']).default('desc')
    }).strict().parse(req.query);
    res.json(await vouchers.listDefinitions(query));
  } catch (error) { sendError(req, res, error); }
};

export const getDefinition = async (req, res) => {
  try { res.json({ data: await vouchers.getDefinition(parseId(req.params.id)) }); } catch (error) { sendError(req, res, error); }
};

export const createDefinition = async (req, res) => {
  try {
    const definition = await vouchers.createDefinition(definitionCreateSchema.parse(req.body), req.user.id);
    res.status(201).json({ data: definition, message: 'Voucher definition created successfully' });
  } catch (error) { sendError(req, res, error); }
};

export const updateDefinition = async (req, res) => {
  try {
    const definition = await vouchers.updateDefinition(parseId(req.params.id), definitionUpdateSchema.parse(req.body));
    res.json({ data: definition, message: 'Voucher definition updated successfully' });
  } catch (error) { sendError(req, res, error); }
};

export const disableDefinition = async (req, res) => {
  try {
    const definition = await vouchers.updateDefinition(parseId(req.params.id), { isActive: false });
    res.json({ data: definition, message: 'Voucher definition disabled successfully' });
  } catch (error) { sendError(req, res, error); }
};

export const enableDefinition = async (req, res) => {
  try {
    const definition = await vouchers.updateDefinition(parseId(req.params.id), { isActive: true });
    res.json({ data: definition, message: 'Voucher definition enabled successfully' });
  } catch (error) { sendError(req, res, error); }
};

export const listMyVouchers = async (req, res) => {
  try {
    requireCustomer(req);
    const query = z.object({
      ...paginationFields,
      status: z.enum(['AVAILABLE', 'USED', 'EXPIRED']).default('AVAILABLE'),
      acquisitionSource: sourceSchema.optional(),
      sortBy: z.enum(['expiresAt', 'issuedAt', 'usedAt', 'id']).optional(),
      sortOrder: z.enum(['asc', 'desc']).optional()
    }).strict().parse(req.query);
    res.json(await vouchers.listMyVouchers(req.user.id, query));
  } catch (error) { sendError(req, res, error); }
};

export const getMyVoucher = async (req, res) => {
  try {
    requireCustomer(req);
    res.json({ data: await vouchers.getMyVoucher(req.user.id, parseId(req.params.id)) });
  } catch (error) { sendError(req, res, error); }
};

export const listPublicVouchers = async (req, res) => {
  try {
    requireCustomer(req);
    res.json(await vouchers.listPublicVouchers(req.user.id));
  } catch (error) { sendError(req, res, error); }
};

export const claimVoucher = async (req, res) => {
  try {
    requireCustomer(req);
    const body = z.object({ voucherDefinitionId: idSchema }).strict().parse(req.body);
    const result = await vouchers.claimVoucher({ userId: req.user.id, voucherDefinitionId: body.voucherDefinitionId });
    notifyAfterCommit({
      recipientId: req.user.id,
      actorId: req.user.id,
      type: 'PUBLIC_VOUCHER_CLAIMED',
      module: 'voucher',
      entityType: 'UserVoucher',
      entityId: result.voucher.id,
      title: 'Voucher claimed',
      message: `Voucher ${result.dto.code} is ready to use.`,
      metadata: { path: `/profile/vouchers/${result.voucher.id}` }
    });
    res.status(201).json({ data: result.dto, message: 'Voucher claimed successfully' });
  } catch (error) { sendError(req, res, error); }
};

const idempotencyKey = (req) => {
  const values = [];
  for (let index = 0; index < req.rawHeaders.length; index += 2) {
    if (req.rawHeaders[index].toLowerCase() === 'idempotency-key') values.push(req.rawHeaders[index + 1]);
  }
  if (values.length === 0) throw new vouchers.VoucherError('IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key header is required', 400);
  if (values.length !== 1 || !values[0]) throw new vouchers.VoucherError('IDEMPOTENCY_KEY_INVALID', 'A single Idempotency-Key header is required', 400);
  const value = values[0];
  const opaque = /^[A-Za-z0-9._~-]{16,128}$/;
  const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!opaque.test(value) && !uuidV4.test(value)) throw new vouchers.VoucherError('IDEMPOTENCY_KEY_INVALID', 'Invalid Idempotency-Key', 400);
  return value;
};

// Assignment is a pre-existing mounted C1 route. It is retained here to avoid
// breaking server startup; its UI remains outside this prompt's scope.
export const assignVouchers = async (req, res) => {
  try {
    const body = z.object({
      voucherDefinitionId: z.number().int().positive().max(2_147_483_647),
      recipientUserIds: z.array(z.number().int().positive().max(2_147_483_647)).max(100).optional(),
      customerEmail: z.string().trim().email().max(255).optional(),
      reason: z.string().trim().max(1000).nullable().optional()
    }).strict().superRefine((value, context) => {
      if (value.customerEmail && value.recipientUserIds) {
        context.addIssue({ code: 'custom', message: 'Provide either customerEmail or recipientUserIds' });
      }
      if (!value.customerEmail && !value.recipientUserIds) {
        context.addIssue({ code: 'custom', message: 'A recipient is required' });
      }
    }).parse(req.body);

    let recipientUserIds = body.recipientUserIds ? [...new Set(body.recipientUserIds)] : [];
    if (body.customerEmail) {
      const customer = await prisma.user.findUnique({
        where: { email: body.customerEmail },
        select: { id: true, role: true, isActive: true }
      });
      if (!customer || customer.role !== 'customer' || !customer.isActive) {
        throw new vouchers.VoucherError('VOUCHER_ASSIGNMENT_CUSTOMER_NOT_FOUND', 'Customer not found', 404);
      }
      recipientUserIds = [customer.id];
    }
    if (recipientUserIds.length === 0) throw new vouchers.VoucherError('VOUCHER_ASSIGNMENT_RECIPIENTS_REQUIRED', 'At least one recipient is required', 400);
    const requestKey = idempotencyKey(req);
    const reason = body.reason || null;
    const payloadHash = vouchers.hashAssignment({ voucherDefinitionId: body.voucherDefinitionId, recipientUserIds, reason });
    const result = await vouchers.assignVouchers({ actorId: req.user.id, voucherDefinitionId: body.voucherDefinitionId, recipientUserIds, reason, requestKey, payloadHash });
    const dto = vouchers.assignmentDto(result.assignment);
    if (!result.replay) {
      for (const recipient of dto.recipients) {
        notifyAfterCommit({
          recipientId: recipient.userId,
          actorId: req.user.id,
          type: 'ADMIN_VOUCHER_ASSIGNED',
          module: 'voucher',
          entityType: 'UserVoucher',
          entityId: recipient.userVoucherId,
          title: 'Voucher assigned',
          message: 'A voucher has been assigned to your account.',
          metadata: { path: `/profile/vouchers/${recipient.userVoucherId}` }
        });
      }
    }
    res.status(result.replay ? 200 : 201).json({ data: dto, ...(result.replay ? { message: 'Original assignment result returned' } : { message: 'Vouchers assigned successfully' }) });
  } catch (error) { sendError(req, res, error); }
};
