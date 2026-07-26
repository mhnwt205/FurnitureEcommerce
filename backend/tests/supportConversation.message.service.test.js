import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import prisma from '../prismaClient.js';
import {
  SupportConversationError,
  getConversationMessages,
  sendConversationMessage
} from '../services/supportConversation.service.js';
import { assertTestDatabaseEnvironment } from './testDatabaseEnvironment.js';

const suffix = crypto.randomUUID();
const email = (name) => `c2-message-${name}-${suffix}@example.test`;
const users = {};
const userContext = (user) => ({ id: user.id, role: user.role, requestId: `test-${suffix}` });
const messageKey = () => crypto.randomUUID();

const expectSupportError = async (promise, code, status) => {
  await assert.rejects(promise, (error) => (
    error instanceof SupportConversationError && error.code === code && error.status === status
  ));
};

const createConversation = (customerId, data = {}) => prisma.conversation.create({
  data: { customerId, status: 'WAITING', ...data }
});

test.before(async () => {
  assertTestDatabaseEnvironment();
  const replyPermission = await prisma.permission.findUnique({ where: { key: 'support_conversation.reply' } });
  assert.ok(replyPermission, 'C2 reply permission must be seeded before message tests run');

  for (const [name, role] of Object.entries({ customer: 'customer', otherCustomer: 'customer', staff: 'staff', otherStaff: 'staff', admin: 'admin' })) {
    users[name] = await prisma.user.create({
      data: {
        fullName: `C2 message ${name}`,
        email: email(name),
        role,
        isActive: true,
        ...(name === 'staff' ? { userPermissions: { create: { permissionId: replyPermission.id } } } : {})
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
    if (ids.length) {
      await prisma.conversation.deleteMany({ where: { customerId: { in: ids } } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
    const remaining = await prisma.user.count({ where: { email: { contains: suffix } } });
    assert.equal(remaining, 0, 'message test fixtures must be cleaned up');
  } finally {
    await prisma.$disconnect();
  }
});

test('customer sends a trimmed message and updates the authoritative conversation summary', async () => {
  const conversation = await createConversation(users.customer.id);
  const result = await sendConversationMessage(userContext(users.customer), conversation.id, {
    content: '  Customer message  ',
    clientMessageId: messageKey()
  });

  assert.equal(result.replay, false);
  assert.equal(result.message.content, 'Customer message');
  assert.equal(result.message.senderRole, 'customer');
  const updated = await prisma.conversation.findUnique({ where: { id: conversation.id } });
  assert.equal(updated.lastMessagePreview, 'Customer message');
  assert.equal(updated.lastSenderRole, 'customer');
  assert.ok(updated.lastMessageAt instanceof Date);
});

test('customer cannot send to another customer conversation and closed conversations reject new messages', async () => {
  const otherConversation = await createConversation(users.otherCustomer.id);
  await expectSupportError(
    sendConversationMessage(userContext(users.customer), otherConversation.id, { content: 'No access', clientMessageId: messageKey() }),
    'CONVERSATION_NOT_FOUND',
    404
  );

  const closedConversation = await createConversation(users.customer.id, { status: 'CLOSED', closedAt: new Date(), closedById: users.admin.id });
  await expectSupportError(
    sendConversationMessage(userContext(users.customer), closedConversation.id, { content: 'Too late', clientMessageId: messageKey() }),
    'CONVERSATION_CLOSED',
    409
  );
});

test('assigned staff and administrators can send, but unassigned staff cannot send or read messages', async () => {
  const conversation = await createConversation(users.customer.id, { status: 'ACTIVE', assignedStaffId: users.staff.id });
  const staffMessage = await sendConversationMessage(userContext(users.staff), conversation.id, { content: 'Assigned reply', clientMessageId: messageKey() });
  assert.equal(staffMessage.message.senderRole, 'staff');

  await expectSupportError(
    sendConversationMessage(userContext(users.otherStaff), conversation.id, { content: 'Unauthorized reply', clientMessageId: messageKey() }),
    'CONVERSATION_NOT_FOUND',
    404
  );
  await expectSupportError(
    getConversationMessages(userContext(users.otherStaff), conversation.id, { limit: 50 }),
    'CONVERSATION_NOT_FOUND',
    404
  );

  const adminMessage = await sendConversationMessage(userContext(users.admin), conversation.id, { content: 'Admin reply', clientMessageId: messageKey() });
  assert.equal(adminMessage.message.senderRole, 'admin');
});

test('same idempotency key returns the original message without inserting a duplicate', async () => {
  const conversation = await createConversation(users.customer.id);
  const clientMessageId = messageKey();
  const first = await sendConversationMessage(userContext(users.customer), conversation.id, { content: 'Retry safe', clientMessageId });
  const replay = await sendConversationMessage(userContext(users.customer), conversation.id, { content: 'Retry safe', clientMessageId });

  assert.equal(replay.replay, true);
  assert.equal(replay.message.id, first.message.id);
  assert.equal(await prisma.conversationMessage.count({ where: { conversationId: conversation.id } }), 1);
  await expectSupportError(
    sendConversationMessage(userContext(users.customer), conversation.id, { content: 'Different content', clientMessageId }),
    'IDEMPOTENCY_KEY_REUSED',
    409
  );
});

test('message history is participant-only, canonically ordered, and cursor-ready', async () => {
  const conversation = await createConversation(users.customer.id, { status: 'ACTIVE', assignedStaffId: users.staff.id });
  const first = await sendConversationMessage(userContext(users.customer), conversation.id, { content: 'First', clientMessageId: messageKey() });
  const second = await sendConversationMessage(userContext(users.staff), conversation.id, { content: 'Second', clientMessageId: messageKey() });
  const third = await sendConversationMessage(userContext(users.customer), conversation.id, { content: 'Third', clientMessageId: messageKey() });

  const customerHistory = await getConversationMessages(userContext(users.customer), conversation.id, { limit: 2 });
  assert.deepEqual(customerHistory.data.map((message) => message.id), [second.message.id, third.message.id]);
  assert.deepEqual(customerHistory.nextCursor, { beforeCreatedAt: second.message.createdAt.toISOString(), beforeId: second.message.id });

  const olderHistory = await getConversationMessages(userContext(users.staff), conversation.id, { limit: 2, ...customerHistory.nextCursor });
  assert.deepEqual(olderHistory.data.map((message) => message.id), [first.message.id]);
  assert.equal(olderHistory.nextCursor, null);
  await expectSupportError(
    getConversationMessages(userContext(users.otherCustomer), conversation.id, { limit: 50 }),
    'CONVERSATION_NOT_FOUND',
    404
  );
});
