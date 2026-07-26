import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import express from 'express';
import test from 'node:test';
import prisma from '../prismaClient.js';
import { adminSupportConversationRoutes, supportConversationRoutes } from '../routes/supportConversation.routes.js';
import { signAccessToken } from '../utils/tokenService.js';
import { assertTestDatabaseEnvironment } from './testDatabaseEnvironment.js';

const suffix = crypto.randomUUID();
const email = (name) => `c2-message-api-${name}-${suffix}@example.test`;
const users = {};
const tokenFor = (user) => signAccessToken({ user });
const headersFor = (user) => ({ Authorization: `Bearer ${tokenFor(user)}`, 'Content-Type': 'application/json' });

const startServer = async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/support/conversations', supportConversationRoutes);
  app.use('/api/admin/support/conversations', adminSupportConversationRoutes);
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  const { port } = server.address();
  return {
    request: (path, options = {}) => fetch(`http://127.0.0.1:${port}${path}`, options),
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  };
};

const createConversation = (customerId, data = {}) => prisma.conversation.create({
  data: { customerId, status: 'WAITING', ...data }
});

test.before(async () => {
  assertTestDatabaseEnvironment();
  const permissions = await prisma.permission.findMany({
    where: { key: { in: ['support_conversation.read', 'support_conversation.reply'] } }
  });
  assert.equal(permissions.length, 2, 'C2 read and reply permissions must be seeded before API tests run');
  const permissionIds = permissions.map((permission) => ({ permissionId: permission.id }));

  for (const [name, role] of Object.entries({ customer: 'customer', otherCustomer: 'customer', staff: 'staff', otherStaff: 'staff', admin: 'admin' })) {
    users[name] = await prisma.user.create({
      data: {
        fullName: `C2 message API ${name}`,
        email: email(name),
        role,
        isActive: true,
        ...(role === 'staff' ? { userPermissions: { create: permissionIds } } : {})
      }
    });
  }
});

test.afterEach(async () => {
  const ids = Object.values(users).map((user) => user.id);
  if (ids.length) await prisma.conversation.deleteMany({ where: { customerId: { in: ids } } });
});

test.after(async () => {
  const ids = Object.values(users).map((user) => user.id);
  try {
    if (ids.length) await prisma.user.deleteMany({ where: { id: { in: ids } } });
    const remaining = await prisma.user.count({ where: { email: { contains: suffix } } });
    assert.equal(remaining, 0, 'message API test fixtures must be cleaned up');
  } finally {
    await prisma.$disconnect();
  }
});

test('customer REST message creation is idempotent and participant message history is readable', async () => {
  const conversation = await createConversation(users.customer.id);
  const clientMessageId = crypto.randomUUID();
  const server = await startServer();
  try {
    const created = await server.request(`/api/support/conversations/${conversation.id}/messages`, {
      method: 'POST',
      headers: headersFor(users.customer),
      body: JSON.stringify({ content: '  REST customer message  ', clientMessageId })
    });
    const createdBody = await created.json();
    assert.equal(created.status, 201);
    assert.equal(createdBody.data.content, 'REST customer message');
    assert.equal(createdBody.data.senderRole, 'customer');

    const replay = await server.request(`/api/support/conversations/${conversation.id}/messages`, {
      method: 'POST',
      headers: headersFor(users.customer),
      body: JSON.stringify({ content: 'REST customer message', clientMessageId })
    });
    const replayBody = await replay.json();
    assert.equal(replay.status, 200);
    assert.equal(replayBody.data.id, createdBody.data.id);

    const history = await server.request(`/api/support/conversations/${conversation.id}/messages`, {
      headers: headersFor(users.customer)
    });
    const historyBody = await history.json();
    assert.equal(history.status, 200);
    assert.deepEqual(historyBody.data.map((message) => message.id), [createdBody.data.id]);

    const inaccessible = await server.request(`/api/support/conversations/${conversation.id}/messages`, {
      headers: headersFor(users.otherCustomer)
    });
    const inaccessibleBody = await inaccessible.json();
    assert.equal(inaccessible.status, 404);
    assert.equal(inaccessibleBody.error.code, 'CONVERSATION_NOT_FOUND');
  } finally {
    await server.close();
  }
});

test('REST validation rejects empty, whitespace-only, oversized, and invalid idempotency keys', async () => {
  const conversation = await createConversation(users.customer.id);
  const server = await startServer();
  try {
    for (const { body, expectedStatus, expectedCode } of [
      { body: { content: '', clientMessageId: crypto.randomUUID() }, expectedStatus: 422, expectedCode: 'MESSAGE_EMPTY' },
      { body: { content: '   ', clientMessageId: crypto.randomUUID() }, expectedStatus: 422, expectedCode: 'MESSAGE_EMPTY' },
      { body: { content: 'x'.repeat(2001), clientMessageId: crypto.randomUUID() }, expectedStatus: 422, expectedCode: 'MESSAGE_TOO_LONG' },
      { body: { content: 'Valid content', clientMessageId: 'contains whitespace' }, expectedStatus: 400, expectedCode: 'VALIDATION_ERROR' }
    ]) {
      const response = await server.request(`/api/support/conversations/${conversation.id}/messages`, {
        method: 'POST',
        headers: headersFor(users.customer),
        body: JSON.stringify(body)
      });
      const responseBody = await response.json();
      assert.equal(response.status, expectedStatus);
      assert.equal(responseBody.error.code, expectedCode);
      assert.ok(responseBody.requestId);
    }
    assert.equal(await prisma.conversationMessage.count({ where: { conversationId: conversation.id } }), 0);
  } finally {
    await server.close();
  }
});

test('staff assignment and closed state rules are enforced through the REST routes while admin retains override access', async () => {
  const active = await createConversation(users.customer.id, { status: 'ACTIVE', assignedStaffId: users.staff.id });
  const closed = await createConversation(users.otherCustomer.id, { status: 'CLOSED', closedAt: new Date(), closedById: users.admin.id });
  const server = await startServer();
  try {
    const staffReply = await server.request(`/api/admin/support/conversations/${active.id}/messages`, {
      method: 'POST',
      headers: headersFor(users.staff),
      body: JSON.stringify({ content: 'Assigned staff reply', clientMessageId: crypto.randomUUID() })
    });
    assert.equal(staffReply.status, 201);

    const unassignedReply = await server.request(`/api/admin/support/conversations/${active.id}/messages`, {
      method: 'POST',
      headers: headersFor(users.otherStaff),
      body: JSON.stringify({ content: 'Unassigned reply', clientMessageId: crypto.randomUUID() })
    });
    const unassignedBody = await unassignedReply.json();
    assert.equal(unassignedReply.status, 404);
    assert.equal(unassignedBody.error.code, 'CONVERSATION_NOT_FOUND');

    const adminReply = await server.request(`/api/admin/support/conversations/${active.id}/messages`, {
      method: 'POST',
      headers: headersFor(users.admin),
      body: JSON.stringify({ content: 'Admin reply', clientMessageId: crypto.randomUUID() })
    });
    assert.equal(adminReply.status, 201);

    const closedReply = await server.request(`/api/support/conversations/${closed.id}/messages`, {
      method: 'POST',
      headers: headersFor(users.otherCustomer),
      body: JSON.stringify({ content: 'Closed reply', clientMessageId: crypto.randomUUID() })
    });
    const closedBody = await closedReply.json();
    assert.equal(closedReply.status, 409);
    assert.equal(closedBody.error.code, 'CONVERSATION_CLOSED');
  } finally {
    await server.close();
  }
});
