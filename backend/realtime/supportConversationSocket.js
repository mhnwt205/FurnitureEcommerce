import crypto from 'crypto';
import { Server } from 'socket.io';
import { findActiveAuthUser, parseBearerToken } from '../middlewares/auth.middleware.js';
import { userHasPermission } from '../middlewares/permission.middleware.js';
import { getCustomerConversation, getStaffConversation } from '../services/supportConversation.service.js';
import { isAllowedOrigin } from '../utils/originPolicy.js';

export const supportSocketEvents = Object.freeze({
  messageCreated: 'conversation.message.created',
  accepted: 'conversation.accepted',
  assigned: 'conversation.assigned',
  closed: 'conversation.closed',
  reopened: 'conversation.reopened'
});

const USER_ROOM = (userId) => `user:${userId}`;
const CONVERSATION_ROOM = (conversationId) => `conversation:${conversationId}`;
const WAITING_ROOM = 'support:waiting';
let supportIo = null;

const logSocketEvent = (eventName, values = {}) => {
  console.info('Support conversation socket event', { eventName, ...values });
};

const socketOrigin = (origin, callback) => {
  if (!origin || isAllowedOrigin(origin)) return callback(null, true);
  return callback(new Error('Origin not allowed'));
};

const validConversationId = (value) => Number.isSafeInteger(value) && value > 0;

const canJoinConversationRoom = async (user, conversationId) => {
  if (user.role === 'customer') {
    await getCustomerConversation(user, conversationId);
    return true;
  }
  if (user.role === 'admin') {
    await getStaffConversation(user, conversationId);
    return true;
  }
  if (user.role === 'staff' && await userHasPermission(user, 'support_conversation.read')) {
    await getStaffConversation(user, conversationId);
    return true;
  }
  return false;
};

const authenticateSocket = async (socket, next) => {
  try {
    const authorization = socket.handshake.auth?.token ?? socket.handshake.headers.authorization;
    const { token } = parseBearerToken(authorization);
    if (!token) return next(new Error('UNAUTHORIZED'));
    const result = await findActiveAuthUser(token);
    if (result.error) return next(new Error('UNAUTHORIZED'));
    socket.user = result.user;
    return next();
  } catch {
    return next(new Error('UNAUTHORIZED'));
  }
};

export const createSupportConversationSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: socketOrigin, credentials: true }
  });
  supportIo = io;
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    const connectedAt = Date.now();
    socket.join(USER_ROOM(socket.user.id));
    logSocketEvent('connected', { socketId: socket.id, userId: socket.user.id, durationMs: Date.now() - connectedAt });

    socket.on('joinConversation', async (payload, acknowledge = () => {}) => {
      const startedAt = Date.now();
      const conversationId = Number(payload?.conversationId);
      if (!validConversationId(conversationId)) return acknowledge({ ok: false, code: 'CONVERSATION_NOT_FOUND' });
      try {
        const allowed = await canJoinConversationRoom(socket.user, conversationId);
        if (!allowed) return acknowledge({ ok: false, code: 'CONVERSATION_NOT_FOUND' });
        await socket.join(CONVERSATION_ROOM(conversationId));
        logSocketEvent('joined', { socketId: socket.id, userId: socket.user.id, conversationId, durationMs: Date.now() - startedAt });
        return acknowledge({ ok: true });
      } catch {
        return acknowledge({ ok: false, code: 'CONVERSATION_NOT_FOUND' });
      }
    });

    socket.on('leaveConversation', async (payload, acknowledge = () => {}) => {
      const conversationId = Number(payload?.conversationId);
      if (!validConversationId(conversationId)) return acknowledge({ ok: false, code: 'CONVERSATION_NOT_FOUND' });
      await socket.leave(CONVERSATION_ROOM(conversationId));
      logSocketEvent('left', { socketId: socket.id, userId: socket.user.id, conversationId });
      return acknowledge({ ok: true });
    });

    socket.on('disconnect', () => {
      logSocketEvent('disconnected', { socketId: socket.id, userId: socket.user.id, durationMs: Date.now() - connectedAt });
    });

    // Register client commands before this asynchronous, non-authoritative queue subscription.
    // A connected client may emit joinConversation immediately after its connect event.
    void userHasPermission(socket.user, 'support_conversation.read')
      .then((allowed) => {
        if (allowed) return socket.join(WAITING_ROOM);
        return undefined;
      })
      .catch(() => {
        // A failed optional queue subscription must not turn an authenticated connection into an authorized one.
      });
  });

  return io;
};

const revokeSupersededStaffRoomAccess = async (conversationId, assignedStaffId) => {
  try {
    const sockets = await supportIo.in(CONVERSATION_ROOM(conversationId)).fetchSockets();
    await Promise.all(sockets.map((socket) => (
      socket.user?.role === 'staff' && socket.user.id !== assignedStaffId
        ? socket.leave(CONVERSATION_ROOM(conversationId))
        : undefined
    )));
  } catch (error) {
    console.error('Support conversation socket room revocation failed', {
      conversationId,
      assignedStaffId,
      name: error?.name
    });
  }
};

export const publishSupportConversationEvent = async ({ eventName, conversationId, messageId, assignedStaffId, revokeStaffExceptId, waiting = false, requestId }) => {
  if (!supportIo || !Object.values(supportSocketEvents).includes(eventName)) return false;
  const payload = {
    eventId: crypto.randomUUID(),
    conversationId,
    occurredAt: new Date().toISOString(),
    ...(messageId ? { messageId } : {}),
    ...(assignedStaffId ? { assignedStaffId } : {})
  };
  try {
    let target = supportIo.to(CONVERSATION_ROOM(conversationId));
    if (waiting && eventName === supportSocketEvents.messageCreated) target = target.to(WAITING_ROOM);
    if (revokeStaffExceptId) target = target.to(USER_ROOM(revokeStaffExceptId));
    target.emit(eventName, payload);
    if (revokeStaffExceptId) await revokeSupersededStaffRoomAccess(conversationId, revokeStaffExceptId);
    logSocketEvent(eventName, { conversationId, messageId: messageId ?? null, requestId: requestId ?? null, eventName });
    return true;
  } catch (error) {
    console.error('Support conversation socket delivery failed', {
      eventName,
      conversationId,
      messageId: messageId ?? null,
      requestId: requestId ?? null,
      name: error?.name
    });
    return false;
  }
};
