import crypto from 'crypto';
import { z } from 'zod';
import { publishSupportConversationEvent, supportSocketEvents } from '../realtime/supportConversationSocket.js';
import {
  SupportConversationError,
  acceptConversation,
  assignConversation,
  closeConversation,
  createOrGetCustomerConversation,
  getConversationMessages,
  getCustomerConversation,
  getStaffConversation,
  listEligibleSupportAssignees,
  listCustomerConversations,
  listStaffConversations,
  reopenConversation,
  sendConversationMessage,
  SUPPORT_MESSAGE_MAX_LENGTH
} from '../services/supportConversation.service.js';

const idSchema = z.coerce.number().int().positive().max(2_147_483_647);
const statusSchema = z.enum(['WAITING', 'ACTIVE', 'CLOSED']);
const paginationFields = {
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20)
};
const customerListSchema = z.object({ ...paginationFields, status: statusSchema.optional() }).strict();
const staffListSchema = z.object({
  ...paginationFields,
  status: statusSchema.optional(),
  assignedStaffId: idSchema.optional(),
  customerId: idSchema.optional()
}).strict();
const assignSchema = z.object({ assignedStaffId: idSchema }).strict();
const emptyBodySchema = z.object({}).strict().default({});
const messageSchema = z.object({
  content: z.string(),
  clientMessageId: z.string().min(1).max(64).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/)
}).strict();
const messageHistorySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(50),
  beforeCreatedAt: z.string().datetime({ offset: true }).optional(),
  beforeId: idSchema.optional()
}).strict().refine(
  (value) => Boolean(value.beforeCreatedAt) === Boolean(value.beforeId),
  { message: 'beforeCreatedAt and beforeId must be provided together', path: ['beforeCreatedAt'] }
);

const requestId = (req) => (
  typeof req.headers['x-request-id'] === 'string' && req.headers['x-request-id'].length <= 128
    ? req.headers['x-request-id']
    : crypto.randomUUID()
);

const validationDetails = (error) => ({ fields: error.issues.reduce((fields, issue) => {
  const key = issue.path.join('.') || 'request';
  fields[key] = [...(fields[key] || []), issue.message];
  return fields;
}, {}) });

const sendError = (req, res, error) => {
  const validation = error instanceof z.ZodError;
  const business = error instanceof SupportConversationError;
  const status = business ? error.status : (validation ? 400 : 500);
  const code = business ? error.code : (validation ? 'VALIDATION_ERROR' : 'INTERNAL_SERVER_ERROR');
  const details = validation ? validationDetails(error) : error?.details;
  if (!business && !validation) {
    console.error('Support conversation request failed', { method: req.method, path: req.path, name: error?.name, code: error?.code });
  }
  return res.status(status).json({
    error: {
      code,
      message: validation ? 'Request validation failed' : (business ? error.message : 'Internal server error'),
      ...(details ? { details } : {})
    },
    requestId: requestId(req)
  });
};

const parseId = (value) => idSchema.parse(value);
const actor = (req) => ({ ...req.user, requestId: requestId(req) });
const parseMessageInput = (body) => {
  const parsed = messageSchema.parse(body);
  const content = parsed.content.trim();
  if (!content) throw new SupportConversationError('MESSAGE_EMPTY', 'Message content cannot be empty', 422);
  if (content.length > SUPPORT_MESSAGE_MAX_LENGTH) {
    throw new SupportConversationError('MESSAGE_TOO_LONG', `Message content must not exceed ${SUPPORT_MESSAGE_MAX_LENGTH} characters`, 422);
  }
  return { ...parsed, content };
};

export const createCustomerConversation = async (req, res) => {
  try {
    emptyBodySchema.parse(req.body);
    const result = await createOrGetCustomerConversation(actor(req));
    return res.status(result.created ? 201 : 200).json({ data: result.dto });
  } catch (error) { return sendError(req, res, error); }
};

export const listCustomerConversationController = async (req, res) => {
  try { return res.json(await listCustomerConversations(actor(req), customerListSchema.parse(req.query))); } catch (error) { return sendError(req, res, error); }
};

export const getCustomerConversationController = async (req, res) => {
  try { return res.json({ data: await getCustomerConversation(actor(req), parseId(req.params.id)) }); } catch (error) { return sendError(req, res, error); }
};

export const getCustomerConversationMessagesController = async (req, res) => {
  try { return res.json(await getConversationMessages(actor(req), parseId(req.params.id), messageHistorySchema.parse(req.query))); } catch (error) { return sendError(req, res, error); }
};

export const sendCustomerConversationMessageController = async (req, res) => {
  try {
    const result = await sendConversationMessage(actor(req), parseId(req.params.id), parseMessageInput(req.body));
    if (!result.replay) await publishSupportConversationEvent({
      eventName: supportSocketEvents.messageCreated,
      conversationId: result.message.conversationId,
      messageId: result.message.id,
      waiting: result.conversationStatus === 'WAITING',
      requestId: requestId(req)
    });
    return res.status(result.replay ? 200 : 201).json({ data: result.message });
  } catch (error) { return sendError(req, res, error); }
};

export const listStaffConversationController = async (req, res) => {
  try { return res.json(await listStaffConversations(actor(req), staffListSchema.parse(req.query))); } catch (error) { return sendError(req, res, error); }
};

export const listEligibleSupportAssigneesController = async (req, res) => {
  try { return res.json({ data: await listEligibleSupportAssignees(actor(req)) }); } catch (error) { return sendError(req, res, error); }
};

export const getStaffConversationController = async (req, res) => {
  try { return res.json({ data: await getStaffConversation(actor(req), parseId(req.params.id)) }); } catch (error) { return sendError(req, res, error); }
};

export const getStaffConversationMessagesController = async (req, res) => {
  try { return res.json(await getConversationMessages(actor(req), parseId(req.params.id), messageHistorySchema.parse(req.query))); } catch (error) { return sendError(req, res, error); }
};

export const sendStaffConversationMessageController = async (req, res) => {
  try {
    const result = await sendConversationMessage(actor(req), parseId(req.params.id), parseMessageInput(req.body));
    if (!result.replay) await publishSupportConversationEvent({
      eventName: supportSocketEvents.messageCreated,
      conversationId: result.message.conversationId,
      messageId: result.message.id,
      waiting: result.conversationStatus === 'WAITING',
      requestId: requestId(req)
    });
    return res.status(result.replay ? 200 : 201).json({ data: result.message });
  } catch (error) { return sendError(req, res, error); }
};

export const acceptConversationController = async (req, res) => {
  try {
    emptyBodySchema.parse(req.body);
    const conversation = await acceptConversation(actor(req), parseId(req.params.id));
    await publishSupportConversationEvent({ eventName: supportSocketEvents.accepted, conversationId: conversation.id, revokeStaffExceptId: conversation.assignedStaff?.id, requestId: requestId(req) });
    return res.json({ data: conversation });
  } catch (error) { return sendError(req, res, error); }
};

export const assignConversationController = async (req, res) => {
  try {
    const { assignedStaffId } = assignSchema.parse(req.body);
    const conversation = await assignConversation(actor(req), parseId(req.params.id), assignedStaffId);
    await publishSupportConversationEvent({
      eventName: supportSocketEvents.assigned,
      conversationId: conversation.id,
      assignedStaffId: conversation.assignedStaff?.id,
      revokeStaffExceptId: conversation.assignedStaff?.id,
      requestId: requestId(req)
    });
    return res.json({ data: conversation });
  } catch (error) { return sendError(req, res, error); }
};

export const closeConversationController = async (req, res) => {
  try {
    emptyBodySchema.parse(req.body);
    const conversation = await closeConversation(actor(req), parseId(req.params.id));
    await publishSupportConversationEvent({ eventName: supportSocketEvents.closed, conversationId: conversation.id, requestId: requestId(req) });
    return res.json({ data: conversation });
  } catch (error) { return sendError(req, res, error); }
};

export const reopenConversationController = async (req, res) => {
  try {
    emptyBodySchema.parse(req.body);
    const conversation = await reopenConversation(actor(req), parseId(req.params.id));
    await publishSupportConversationEvent({ eventName: supportSocketEvents.reopened, conversationId: conversation.id, requestId: requestId(req) });
    return res.json({ data: conversation });
  } catch (error) { return sendError(req, res, error); }
};
