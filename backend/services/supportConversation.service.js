import { Prisma } from '@prisma/client';
import prisma from '../prismaClient.js';

const OPEN_STATUSES = ['WAITING', 'ACTIVE'];
export const SUPPORT_MESSAGE_MAX_LENGTH = 2000;
const CONVERSATION_INCLUDE = {
  customer: { select: { id: true, fullName: true, avatarUrl: true } },
  assignedStaff: { select: { id: true, fullName: true, role: true } }
};
const MESSAGE_INCLUDE = {
  sender: { select: { id: true, fullName: true, role: true } }
};

export class SupportConversationError extends Error {
  constructor(code, message, status = 409, details) {
    super(message);
    this.name = 'SupportConversationError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const transactionOptions = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  maxWait: 20_000,
  timeout: 30_000
};

const isAdmin = (user) => user?.role === 'admin';
const notFound = () => new SupportConversationError('CONVERSATION_NOT_FOUND', 'Conversation not found', 404);

export const conversationDto = (conversation) => ({
  id: conversation.id,
  customer: conversation.customer,
  assignedStaff: conversation.assignedStaff,
  status: conversation.status,
  lastMessageAt: conversation.lastMessageAt,
  lastMessagePreview: conversation.lastMessagePreview,
  lastSenderRole: conversation.lastSenderRole,
  customerLastReadAt: conversation.customerLastReadAt,
  customerLastReadMessageId: conversation.customerLastReadMessageId,
  staffLastReadAt: conversation.staffLastReadAt,
  staffLastReadMessageId: conversation.staffLastReadMessageId,
  closedAt: conversation.closedAt,
  closedById: conversation.closedById,
  createdAt: conversation.createdAt,
  updatedAt: conversation.updatedAt,
  // C2-3 owns message/read APIs. Before messages exist, this authoritative
  // derived value is necessarily zero while preserving the frozen DTO shape.
  unreadCount: 0
});

const getConversation = (client, id) => client.conversation.findUnique({
  where: { id },
  include: CONVERSATION_INCLUDE
});

const messageDto = (message) => ({
  id: message.id,
  conversationId: message.conversationId,
  sender: message.sender,
  senderRole: message.senderRole,
  messageType: message.messageType,
  content: message.content,
  createdAt: message.createdAt,
  clientMessageId: message.clientMessageId
});

const ensureCustomer = (user) => {
  if (user?.role !== 'customer') {
    throw new SupportConversationError('FORBIDDEN', 'Customer access is required', 403);
  }
};

const canStaffView = (user, conversation) => (
  conversation.status === 'WAITING' && conversation.assignedStaffId === null
) || conversation.assignedStaffId === user.id;

const ensureStaffVisible = (user, conversation) => {
  if (!conversation || (!isAdmin(user) && !canStaffView(user, conversation))) throw notFound();
  return conversation;
};

const ensureStaffCanOperate = (user, conversation) => {
  ensureStaffVisible(user, conversation);
  if (!isAdmin(user) && conversation.assignedStaffId !== user.id) throw notFound();
  return conversation;
};

const ensureMessageParticipant = (user, conversation) => {
  if (!conversation) throw notFound();
  if (isAdmin(user)) return conversation;
  if (user?.role === 'customer' && conversation.customerId === user.id) return conversation;
  if (user?.role === 'staff' && conversation.assignedStaffId === user.id) return conversation;
  throw notFound();
};

const previewForConversation = (content) => {
  let preview = '';
  for (const character of content) {
    if (preview.length + character.length > 200) break;
    preview += character;
  }
  return preview;
};

const normalizeMessageContent = (content) => {
  if (typeof content !== 'string') {
    throw new SupportConversationError('MESSAGE_EMPTY', 'Message content cannot be empty', 422);
  }
  const normalized = content.trim();
  if (!normalized) throw new SupportConversationError('MESSAGE_EMPTY', 'Message content cannot be empty', 422);
  if (normalized.length > SUPPORT_MESSAGE_MAX_LENGTH) {
    throw new SupportConversationError('MESSAGE_TOO_LONG', `Message content must not exceed ${SUPPORT_MESSAGE_MAX_LENGTH} characters`, 422);
  }
  return normalized;
};

const logMessageEvent = ({ event, conversationId, user, messageId, startedAt, outcome }) => {
  console.info('Support conversation message event', {
    requestId: user?.requestId ?? null,
    event,
    conversationId,
    userId: user?.id ?? null,
    messageId,
    durationMs: Date.now() - startedAt,
    outcome
  });
};

const findOpenConversation = (client, customerId) => client.conversation.findFirst({
  where: { customerId, status: { in: OPEN_STATUSES } },
  include: CONVERSATION_INCLUDE,
  orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
});

const logEvent = (event, conversation, actorId, outcome = 'success') => {
  console.info('Support conversation event', {
    requestId: actorId?.requestId ?? null,
    event,
    conversationId: conversation.id,
    actorId: typeof actorId === 'object' ? actorId.id : actorId,
    status: conversation.status,
    outcome
  });
};

export const createOrGetCustomerConversation = async (user) => {
  ensureCustomer(user);
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await findOpenConversation(tx, user.id);
      if (existing) return { conversation: existing, created: false };

      const conversation = await tx.conversation.create({
        data: { customerId: user.id, status: 'WAITING' },
        include: CONVERSATION_INCLUDE
      });
      return { conversation, created: true };
    }, transactionOptions);

    if (result.created) logEvent('created', result.conversation, user);
    return { ...result, dto: conversationDto(result.conversation) };
  } catch (error) {
    if (error?.code !== 'P2002' && error?.code !== 'P2034') throw error;
    const existing = await findOpenConversation(prisma, user.id);
    if (existing) return { conversation: existing, created: false, dto: conversationDto(existing) };
    throw new SupportConversationError('CUSTOMER_ALREADY_HAS_OPEN_CONVERSATION', 'Customer already has an open conversation');
  }
};

export const listCustomerConversations = async (user, { page, limit, status }) => {
  ensureCustomer(user);
  const where = { customerId: user.id, ...(status ? { status } : {}) };
  const [totalItems, rows] = await prisma.$transaction([
    prisma.conversation.count({ where }),
    prisma.conversation.findMany({
      where,
      include: CONVERSATION_INCLUDE,
      orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit
    })
  ]);
  return {
    data: rows.map(conversationDto),
    pagination: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) }
  };
};

export const getCustomerConversation = async (user, id) => {
  ensureCustomer(user);
  const conversation = await getConversation(prisma, id);
  if (!conversation || conversation.customerId !== user.id) throw notFound();
  return conversationDto(conversation);
};

export const listStaffConversations = async (user, { page, limit, status, assignedStaffId, customerId }) => {
  const filters = {
    ...(status ? { status } : {}),
    ...(assignedStaffId ? { assignedStaffId } : {}),
    ...(customerId ? { customerId } : {})
  };
  const visibility = isAdmin(user)
    ? {}
    : { OR: [{ status: 'WAITING', assignedStaffId: null }, { assignedStaffId: user.id }] };
  const where = { AND: [filters, visibility] };
  const [totalItems, rows] = await prisma.$transaction([
    prisma.conversation.count({ where }),
    prisma.conversation.findMany({
      where,
      include: CONVERSATION_INCLUDE,
      orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit
    })
  ]);
  return {
    data: rows.map(conversationDto),
    pagination: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) }
  };
};

export const getStaffConversation = async (user, id) => {
  const conversation = await getConversation(prisma, id);
  return conversationDto(ensureStaffVisible(user, conversation));
};

export const acceptConversation = async (user, id) => {
  try {
    const conversation = await prisma.$transaction(async (tx) => {
    const transition = await tx.conversation.updateMany({
      where: { id, status: 'WAITING', assignedStaffId: null },
      data: {
        assignedStaffId: user.id,
        status: 'ACTIVE',
        staffLastReadAt: null,
        staffLastReadMessageId: null
      }
    });

    if (transition.count !== 1) {
      const current = await tx.conversation.findUnique({ where: { id }, select: { id: true } });
      if (!current) throw notFound();
      throw new SupportConversationError('CONVERSATION_ALREADY_ASSIGNED', 'Conversation has already been assigned');
    }
    return getConversation(tx, id);
    }, transactionOptions);

    logEvent('accepted_by_staff', conversation, user);
    return conversationDto(conversation);
  } catch (error) {
    if (error?.code === 'P2034') {
      throw new SupportConversationError('CONVERSATION_ALREADY_ASSIGNED', 'Conversation assignment changed concurrently');
    }
    throw error;
  }
};

const eligibleSupportAssigneeWhere = {
  isActive: true,
  OR: [
    { role: 'admin' },
    {
      role: 'staff',
      userPermissions: {
        some: {
          permission: { key: 'support_conversation.reply' }
        }
      }
    }
  ]
};

const supportAssigneeSelect = {
  id: true,
  fullName: true,
  email: true,
  role: true
};

export const listEligibleSupportAssignees = async (user) => {
  if (!isAdmin(user)) {
    throw new SupportConversationError('FORBIDDEN', 'Only an administrator can list support assignees', 403);
  }

  return prisma.user.findMany({
    where: eligibleSupportAssigneeWhere,
    select: supportAssigneeSelect,
    orderBy: [{ fullName: 'asc' }, { email: 'asc' }, { id: 'asc' }]
  });
};

const ensureEligibleAssignee = async (client, assignedStaffId) => {
  const assignee = await client.user.findFirst({
    where: { id: assignedStaffId, ...eligibleSupportAssigneeWhere },
    select: { id: true }
  });
  if (!assignee) {
    throw new SupportConversationError('STAFF_NOT_ELIGIBLE', 'Assigned staff member is not eligible', 422);
  }
};

export const assignConversation = async (user, id, assignedStaffId) => {
  if (!isAdmin(user)) throw new SupportConversationError('FORBIDDEN', 'Only an administrator can assign conversations', 403);

  try {
    const conversation = await prisma.$transaction(async (tx) => {
    await ensureEligibleAssignee(tx, assignedStaffId);
    const current = await tx.conversation.findUnique({
      where: { id },
      select: { id: true, status: true, assignedStaffId: true }
    });
    if (!current) throw notFound();

    let transition;
    const assignmentEvent = current.status === 'ACTIVE' ? 'reassigned' : 'assigned_by_admin';
    if (current.status === 'WAITING' && current.assignedStaffId === null) {
      transition = await tx.conversation.updateMany({
        where: { id, status: 'WAITING', assignedStaffId: null },
        data: { assignedStaffId, status: 'ACTIVE', staffLastReadAt: null, staffLastReadMessageId: null }
      });
    } else if (current.status === 'ACTIVE') {
      transition = await tx.conversation.updateMany({
        where: { id, status: 'ACTIVE', assignedStaffId: current.assignedStaffId },
        data: { assignedStaffId, staffLastReadAt: null, staffLastReadMessageId: null }
      });
    } else {
      throw new SupportConversationError('INVALID_CONVERSATION_TRANSITION', 'Conversation cannot be assigned in its current state');
    }

    if (transition.count !== 1) throw new SupportConversationError('CONVERSATION_ALREADY_ASSIGNED', 'Conversation assignment changed concurrently');
    return { conversation: await getConversation(tx, id), assignmentEvent };
    }, transactionOptions);

    logEvent(conversation.assignmentEvent, conversation.conversation, user);
    return conversationDto(conversation.conversation);
  } catch (error) {
    if (error?.code === 'P2034') {
      throw new SupportConversationError('CONVERSATION_ALREADY_ASSIGNED', 'Conversation assignment changed concurrently');
    }
    throw error;
  }
};

export const closeConversation = async (user, id) => {
  try {
    const conversation = await prisma.$transaction(async (tx) => {
    const current = await getConversation(tx, id);
    ensureStaffCanOperate(user, current);
    const where = isAdmin(user)
      ? { id, status: 'ACTIVE' }
      : { id, status: 'ACTIVE', assignedStaffId: user.id };
    const transition = await tx.conversation.updateMany({
      where,
      data: { status: 'CLOSED', closedAt: new Date(), closedById: user.id }
    });
    if (transition.count !== 1) {
      const latest = await getConversation(tx, id);
      if (!latest || (!isAdmin(user) && latest.assignedStaffId !== user.id)) throw notFound();
      throw new SupportConversationError('INVALID_CONVERSATION_TRANSITION', 'Conversation cannot be closed in its current state');
    }
    return getConversation(tx, id);
    }, transactionOptions);

    logEvent('closed', conversation, user);
    return conversationDto(conversation);
  } catch (error) {
    if (error?.code === 'P2034') {
      throw new SupportConversationError('INVALID_CONVERSATION_TRANSITION', 'Conversation changed concurrently');
    }
    throw error;
  }
};

export const reopenConversation = async (user, id) => {
  if (!isAdmin(user)) throw new SupportConversationError('FORBIDDEN', 'Only an administrator can reopen conversations', 403);
  try {
    const conversation = await prisma.$transaction(async (tx) => {
      const current = await tx.conversation.findUnique({
        where: { id },
        select: { id: true, customerId: true, status: true, updatedAt: true }
      });
      if (!current) throw notFound();
      if (current.status !== 'CLOSED') {
        throw new SupportConversationError('INVALID_CONVERSATION_TRANSITION', 'Conversation cannot be reopened in its current state');
      }
      const openConversation = await findOpenConversation(tx, current.customerId);
      if (openConversation) {
        throw new SupportConversationError('CUSTOMER_ALREADY_HAS_OPEN_CONVERSATION', 'Customer already has an open conversation');
      }
      const transition = await tx.conversation.updateMany({
        where: { id, status: 'CLOSED', updatedAt: current.updatedAt },
        data: { status: 'WAITING', assignedStaffId: null, closedAt: null, closedById: null }
      });
      if (transition.count !== 1) throw new SupportConversationError('INVALID_CONVERSATION_TRANSITION', 'Conversation changed concurrently');
      return getConversation(tx, id);
    }, transactionOptions);
    logEvent('reopened', conversation, user);
    return conversationDto(conversation);
  } catch (error) {
    if (error?.code === 'P2002' || error?.code === 'P2034') {
      throw new SupportConversationError('CUSTOMER_ALREADY_HAS_OPEN_CONVERSATION', 'Customer already has an open conversation');
    }
    throw error;
  }
};

const messageIdempotencyWhere = (conversationId, senderId, clientMessageId) => ({
  conversationId_senderId_clientMessageId: { conversationId, senderId, clientMessageId }
});

const findExistingMessage = (client, conversationId, senderId, clientMessageId) => client.conversationMessage.findUnique({
  where: messageIdempotencyWhere(conversationId, senderId, clientMessageId),
  include: MESSAGE_INCLUDE
});

const resolveIdempotencyReplay = (existing, content) => {
  if (!existing) return null;
  if (existing.content !== content) {
    throw new SupportConversationError('IDEMPOTENCY_KEY_REUSED', 'clientMessageId has already been used for different content');
  }
  return { message: messageDto(existing), replay: true };
};

export const sendConversationMessage = async (user, conversationId, { content, clientMessageId }) => {
  const normalizedContent = normalizeMessageContent(content);
  const startedAt = Date.now();
  let lastSerializationError;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const conversation = await tx.conversation.findUnique({
          where: { id: conversationId },
          select: { id: true, customerId: true, assignedStaffId: true, status: true }
        });
        ensureMessageParticipant(user, conversation);

        const existing = await findExistingMessage(tx, conversationId, user.id, clientMessageId);
        const replay = resolveIdempotencyReplay(existing, normalizedContent);
        if (replay) return replay;

        if (!OPEN_STATUSES.includes(conversation.status)) {
          throw new SupportConversationError('CONVERSATION_CLOSED', 'Conversation is closed');
        }

        const message = await tx.conversationMessage.create({
          data: {
            conversationId,
            senderId: user.id,
            senderRole: user.role,
            messageType: 'TEXT',
            content: normalizedContent,
            clientMessageId
          },
          include: MESSAGE_INCLUDE
        });
        await tx.conversation.update({
          where: { id: conversationId },
          data: {
            lastMessageAt: message.createdAt,
            lastMessagePreview: previewForConversation(normalizedContent),
            lastSenderRole: user.role
          }
        });
        return { message: messageDto(message), replay: false, conversationStatus: conversation.status };
      }, transactionOptions);

      logMessageEvent({
        event: result.replay ? 'replayed' : 'persisted',
        conversationId,
        user,
        messageId: result.message.id,
        startedAt,
        outcome: 'success'
      });
      return result;
    } catch (error) {
      if (error?.code === 'P2034') {
        lastSerializationError = error;
        continue;
      }
      if (error?.code !== 'P2002') throw error;

      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { id: true, customerId: true, assignedStaffId: true, status: true }
      });
      ensureMessageParticipant(user, conversation);
      const existing = await findExistingMessage(prisma, conversationId, user.id, clientMessageId);
      const replay = resolveIdempotencyReplay(existing, normalizedContent);
      if (replay) {
        logMessageEvent({ event: 'replayed', conversationId, user, messageId: replay.message.id, startedAt, outcome: 'success' });
        return replay;
      }
      throw error;
    }
  }

  throw new SupportConversationError('INVALID_CONVERSATION_TRANSITION', 'Conversation changed concurrently', 409, {
    retryable: Boolean(lastSerializationError)
  });
};

export const getConversationMessages = async (user, conversationId, { limit, beforeCreatedAt, beforeId }) => {
  return prisma.$transaction(async (tx) => {
    const conversation = await tx.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true, customerId: true, assignedStaffId: true, status: true }
    });
    ensureMessageParticipant(user, conversation);

    const cursorDate = beforeCreatedAt ? new Date(beforeCreatedAt) : null;
    if (cursorDate && beforeId) {
      const cursorMessage = await tx.conversationMessage.findFirst({
        where: { id: beforeId, conversationId, createdAt: cursorDate },
        select: { id: true }
      });
      if (!cursorMessage) throw new SupportConversationError('VALIDATION_ERROR', 'Message cursor is invalid', 400);
    }
    const before = cursorDate && beforeId
      ? {
        OR: [
          { createdAt: { lt: cursorDate } },
          { createdAt: cursorDate, id: { lt: beforeId } }
        ]
      }
      : {};
    const rows = await tx.conversationMessage.findMany({
      where: { conversationId, ...before },
      include: MESSAGE_INCLUDE,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1
    });
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit).reverse();
    const oldest = page[0];

    return {
      data: page.map(messageDto),
      nextCursor: hasMore && oldest
        ? { beforeCreatedAt: oldest.createdAt.toISOString(), beforeId: oldest.id }
        : null
    };
  }, transactionOptions);
};
