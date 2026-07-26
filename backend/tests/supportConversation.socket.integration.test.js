import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createServer } from 'node:http';
import express from 'express';
import jwt from 'jsonwebtoken';
import test from 'node:test';
import { io as createClient } from 'socket.io-client';
import prisma from '../prismaClient.js';
import { adminSupportConversationRoutes, supportConversationRoutes } from '../routes/supportConversation.routes.js';
import { createSupportConversationSocketServer } from '../realtime/supportConversationSocket.js';
import { getAccessTokenSecret, signAccessToken } from '../utils/tokenService.js';
import { assertTestDatabaseEnvironment } from './testDatabaseEnvironment.js';

const suffix = crypto.randomUUID();
const email = (name) => `c2-socket-${name}-${suffix}@example.test`;
const users = {};
let realtime;
const clients = new Set();
const tokenFor = (user) => signAccessToken({ user });
const socketEvent = Object.freeze({
  messageCreated: 'conversation.message.created',
  accepted: 'conversation.accepted',
  assigned: 'conversation.assigned',
  closed: 'conversation.closed',
  reopened: 'conversation.reopened'
});

const headersFor = (user) => ({ Authorization: `Bearer ${tokenFor(user)}`, 'Content-Type': 'application/json' });
const waitFor = (emitter, event, timeout = 2_000) => new Promise((resolve, reject) => {
  let timer;
  const listener = (...args) => {
    cleanup();
    resolve(args);
  };
  const cleanup = () => {
    clearTimeout(timer);
    emitter.off(event, listener);
  };
  timer = setTimeout(() => {
    cleanup();
    reject(new Error(`Timed out waiting for ${event}`));
  }, timeout);
  emitter.once(event, listener);
});
const expectNoEvent = (emitter, event, timeout = 250) => new Promise((resolve, reject) => {
  let timer;
  const listener = () => {
    cleanup();
    reject(new Error(`Unexpected ${event}`));
  };
  const cleanup = () => {
    clearTimeout(timer);
    emitter.off(event, listener);
  };
  emitter.once(event, listener);
  timer = setTimeout(() => {
    cleanup();
    resolve();
  }, timeout);
});
const closeClient = (socket) => {
  if (!socket) return;
  clients.delete(socket);
  socket.close();
};
const nextTurn = () => new Promise((resolve) => setImmediate(resolve));
const connectSocket = async (url, token) => {
  const socket = createClient(url, {
    auth: { token: `Bearer ${token}` },
    transports: ['websocket'],
    forceNew: true,
    reconnection: false
  });
  clients.add(socket);
  try {
    await waitFor(socket, 'connect');
    return socket;
  } catch (error) {
    closeClient(socket);
    throw error;
  }
};
const connectFailure = async (url, token) => {
  const socket = createClient(url, {
    auth: { token: `Bearer ${token}` },
    transports: ['websocket'],
    forceNew: true,
    reconnection: false
  });
  clients.add(socket);
  try {
    const [error] = await waitFor(socket, 'connect_error');
    return error;
  } finally {
    closeClient(socket);
  }
};
const emitWithAcknowledgement = (socket, event, payload, timeout = 2_000) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${event} acknowledgement`)), timeout);
  socket.emit(event, payload, (result) => {
    clearTimeout(timer);
    resolve(result);
  });
});
const joinConversation = (socket, conversationId) => emitWithAcknowledgement(socket, 'joinConversation', { conversationId });
const leaveConversation = (socket, conversationId) => emitWithAcknowledgement(socket, 'leaveConversation', { conversationId });
const createConversation = (customerId, data = {}) => prisma.conversation.create({
  data: { customerId, status: 'WAITING', ...data }
});

const startRealtimeServer = async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/support/conversations', supportConversationRoutes);
  app.use('/api/admin/support/conversations', adminSupportConversationRoutes);
  const server = createServer(app);
  const io = createSupportConversationSocketServer(server);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  return {
    io,
    baseUrl,
    request: (path, options = {}) => fetch(`${baseUrl}${path}`, {
      ...options,
      headers: { Connection: 'close', ...(options.headers || {}) },
      signal: options.signal ?? AbortSignal.timeout(5_000)
    }),
    close: async () => {
      io.disconnectSockets(true);
      await new Promise((resolve, reject) => io.close((error) => error ? reject(error) : resolve()));
      server.closeAllConnections?.();
      if (server.listening) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  };
};

test.before(async () => {
  assertTestDatabaseEnvironment();
  const permissions = await prisma.permission.findMany({
    where: { key: { in: ['support_conversation.read', 'support_conversation.accept', 'support_conversation.reply', 'support_conversation.assign', 'support_conversation.close'] } }
  });
  assert.equal(permissions.length, 5, 'C2 permissions must be seeded before socket tests run');
  const permissionIds = permissions.map((permission) => ({ permissionId: permission.id }));
  for (const [name, role] of Object.entries({ customer: 'customer', otherCustomer: 'customer', staff: 'staff', otherStaff: 'staff', admin: 'admin', inactive: 'customer', deleted: 'customer' })) {
    users[name] = await prisma.user.create({
      data: {
        fullName: `C2 socket ${name}`,
        email: email(name),
        role,
        isActive: name !== 'inactive',
        ...(role === 'staff' ? { userPermissions: { create: permissionIds } } : {})
      }
    });
  }
  users.deletedToken = tokenFor(users.deleted);
  await prisma.user.delete({ where: { id: users.deleted.id } });
  realtime = await startRealtimeServer();
});

test.afterEach(async () => {
  for (const client of clients) client.close();
  clients.clear();
  realtime.io.disconnectSockets(true);
  const customerIds = [users.customer?.id, users.otherCustomer?.id].filter(Boolean);
  if (customerIds.length) await prisma.conversation.deleteMany({ where: { customerId: { in: customerIds } } });
});

test.after(async () => {
  const ids = Object.values(users).filter((value) => value?.id).map((user) => user.id);
  try {
    for (const client of clients) client.close();
    clients.clear();
    await realtime.close();
    const customerIds = [users.customer?.id, users.otherCustomer?.id].filter(Boolean);
    if (customerIds.length) await prisma.conversation.deleteMany({ where: { customerId: { in: customerIds } } });
    if (ids.length) await prisma.user.deleteMany({ where: { id: { in: ids } } });
    const remaining = await prisma.user.count({ where: { email: { contains: suffix } } });
    assert.equal(remaining, 0, 'socket test fixtures must be cleaned up');
  } finally {
    await prisma.$disconnect();
  }
});

test('Socket.IO handshake accepts active JWT users and rejects invalid, expired, deleted, and inactive identities', async () => {
  const valid = await connectSocket(realtime.baseUrl, tokenFor(users.customer));
  try {
    assert.ok(valid.id);
    for (const token of [
      'not-a-jwt',
      jwt.sign({ id: users.customer.id, sub: String(users.customer.id) }, getAccessTokenSecret(), { expiresIn: '-1s' }),
      users.deletedToken,
      tokenFor(users.inactive)
    ]) {
      const error = await connectFailure(realtime.baseUrl, token);
      assert.equal(error.message, 'UNAUTHORIZED');
    }
  } finally {
    closeClient(valid);
  }
});

test('conversation rooms enforce customer ownership, staff assignment, and admin override', async () => {
  const active = await createConversation(users.customer.id, { status: 'ACTIVE', assignedStaffId: users.staff.id });
  const foreign = await createConversation(users.otherCustomer.id, { status: 'WAITING' });
  const customer = await connectSocket(realtime.baseUrl, tokenFor(users.customer));
  const foreignCustomer = await connectSocket(realtime.baseUrl, tokenFor(users.otherCustomer));
  const staff = await connectSocket(realtime.baseUrl, tokenFor(users.staff));
  const otherStaff = await connectSocket(realtime.baseUrl, tokenFor(users.otherStaff));
  const admin = await connectSocket(realtime.baseUrl, tokenFor(users.admin));
  try {
    assert.deepEqual(await joinConversation(customer, active.id), { ok: true });
    assert.deepEqual(await joinConversation(foreignCustomer, active.id), { ok: false, code: 'CONVERSATION_NOT_FOUND' });
    assert.deepEqual(await joinConversation(staff, active.id), { ok: true });
    assert.deepEqual(await joinConversation(otherStaff, active.id), { ok: false, code: 'CONVERSATION_NOT_FOUND' });
    assert.deepEqual(await joinConversation(admin, active.id), { ok: true });
  } finally {
    closeClient(customer); closeClient(foreignCustomer); closeClient(staff); closeClient(otherStaff); closeClient(admin);
  }
});

test('acceptance and reassignment revoke superseded staff room access while notifying the new assignee', async () => {
  const waiting = await createConversation(users.customer.id);
  const firstStaff = await connectSocket(realtime.baseUrl, tokenFor(users.staff));
  const secondStaff = await connectSocket(realtime.baseUrl, tokenFor(users.otherStaff));
  try {
    assert.deepEqual(await joinConversation(firstStaff, waiting.id), { ok: true });
    assert.deepEqual(await joinConversation(secondStaff, waiting.id), { ok: true });
    const acceptedFirst = waitFor(firstStaff, socketEvent.accepted);
    const acceptedSecond = waitFor(secondStaff, socketEvent.accepted);
    const accepted = await realtime.request(`/api/admin/support/conversations/${waiting.id}/accept`, { method: 'POST', headers: headersFor(users.staff), body: '{}' });
    assert.equal(accepted.status, 200);
    await accepted.text();
    await Promise.all([acceptedFirst, acceptedSecond]);

    const secondNoMessage = expectNoEvent(secondStaff, socketEvent.messageCreated);
    const firstMessage = await realtime.request(`/api/support/conversations/${waiting.id}/messages`, { method: 'POST', headers: headersFor(users.customer), body: JSON.stringify({ content: 'Only assigned staff receives this', clientMessageId: crypto.randomUUID() }) });
    assert.equal(firstMessage.status, 201);
    await firstMessage.text();
    await secondNoMessage;

    const assignedFirst = waitFor(firstStaff, socketEvent.assigned);
    const assignedSecond = waitFor(secondStaff, socketEvent.assigned);
    const reassigned = await realtime.request(`/api/admin/support/conversations/${waiting.id}/assign`, { method: 'POST', headers: headersFor(users.admin), body: JSON.stringify({ assignedStaffId: users.otherStaff.id }) });
    assert.equal(reassigned.status, 200);
    await reassigned.text();
    await Promise.all([assignedFirst, assignedSecond]);
    assert.deepEqual(await joinConversation(secondStaff, waiting.id), { ok: true });

    const firstNoMessage = expectNoEvent(firstStaff, socketEvent.messageCreated);
    const secondMessage = await realtime.request(`/api/support/conversations/${waiting.id}/messages`, { method: 'POST', headers: headersFor(users.customer), body: JSON.stringify({ content: 'Only the replacement receives this', clientMessageId: crypto.randomUUID() }) });
    assert.equal(secondMessage.status, 201);
    await secondMessage.text();
    await firstNoMessage;
  } finally {
    closeClient(firstStaff);
    closeClient(secondStaff);
  }
});

test('REST message persistence emits one minimal event, respects leave/reconnect, and emits nothing after a failed write', async () => {
  const waiting = await createConversation(users.customer.id);
  let customer = await connectSocket(realtime.baseUrl, tokenFor(users.customer));
  const foreignCustomer = await connectSocket(realtime.baseUrl, tokenFor(users.otherCustomer));
  try {
    assert.deepEqual(await joinConversation(customer, waiting.id), { ok: true });
    assert.deepEqual(await joinConversation(foreignCustomer, waiting.id), { ok: false, code: 'CONVERSATION_NOT_FOUND' });
    let messageEventCount = 0;
    const countMessageEvent = () => { messageEventCount += 1; };
    customer.on(socketEvent.messageCreated, countMessageEvent);
    const messageEvent = waitFor(customer, socketEvent.messageCreated);
    const foreignCustomerNoEvent = expectNoEvent(foreignCustomer, socketEvent.messageCreated);
    const messageResponse = await realtime.request(`/api/support/conversations/${waiting.id}/messages`, {
      method: 'POST', headers: headersFor(users.customer), body: JSON.stringify({ content: 'Persist before emit', clientMessageId: crypto.randomUUID() })
    });
    assert.equal(messageResponse.status, 201);
    await messageResponse.text();
    const [messagePayload] = await messageEvent;
    await foreignCustomerNoEvent;
    await nextTurn();
    assert.equal(messageEventCount, 1);
    customer.off(socketEvent.messageCreated, countMessageEvent);
    assert.equal(messagePayload.conversationId, waiting.id);
    assert.ok(messagePayload.eventId && messagePayload.occurredAt);
    assert.equal(Object.hasOwn(messagePayload, 'content'), false);

    await leaveConversation(customer, waiting.id);
    const customerNoEvent = expectNoEvent(customer, socketEvent.messageCreated);
    const failed = await realtime.request(`/api/support/conversations/${waiting.id}/messages`, {
      method: 'POST', headers: headersFor(users.customer), body: JSON.stringify({ content: '   ', clientMessageId: crypto.randomUUID() })
    });
    assert.equal(failed.status, 422);
    await failed.text();
    await customerNoEvent;

    const reconnected = await connectSocket(realtime.baseUrl, tokenFor(users.customer));
    assert.deepEqual(await joinConversation(reconnected, waiting.id), { ok: true });
    const reconnectEvent = waitFor(reconnected, socketEvent.messageCreated);
    const secondMessage = await realtime.request(`/api/support/conversations/${waiting.id}/messages`, {
      method: 'POST', headers: headersFor(users.customer), body: JSON.stringify({ content: 'After reconnect', clientMessageId: crypto.randomUUID() })
    });
    assert.equal(secondMessage.status, 201);
    await secondMessage.text();
    await reconnectEvent;
    closeClient(reconnected);
  } finally {
    closeClient(customer);
    closeClient(foreignCustomer);
  }
});

test('REST accept, assign, close, and reopen each emit exactly one committed lifecycle event', async () => {
  const waiting = await createConversation(users.customer.id);
  const customer = await connectSocket(realtime.baseUrl, tokenFor(users.customer));
  try {
    assert.deepEqual(await joinConversation(customer, waiting.id), { ok: true });
    for (const [eventName, path, user, body, assertion] of [
      [socketEvent.accepted, `/api/admin/support/conversations/${waiting.id}/accept`, users.staff, {}, (payload) => assert.equal(payload.conversationId, waiting.id)],
      [socketEvent.assigned, `/api/admin/support/conversations/${waiting.id}/assign`, users.admin, { assignedStaffId: users.otherStaff.id }, (payload) => assert.equal(payload.assignedStaffId, users.otherStaff.id)],
      [socketEvent.closed, `/api/admin/support/conversations/${waiting.id}/close`, users.admin, {}, (payload) => assert.equal(payload.conversationId, waiting.id)],
      [socketEvent.reopened, `/api/admin/support/conversations/${waiting.id}/reopen`, users.admin, {}, (payload) => assert.equal(payload.conversationId, waiting.id)]
    ]) {
      const event = waitFor(customer, eventName);
      const response = await realtime.request(path, { method: 'POST', headers: headersFor(user), body: JSON.stringify(body) });
      assert.equal(response.ok, true);
      await response.text();
      const [payload] = await event;
      assertion(payload);
      assert.ok(payload.eventId && payload.occurredAt);
    }
  } finally {
    closeClient(customer);
  }
});
