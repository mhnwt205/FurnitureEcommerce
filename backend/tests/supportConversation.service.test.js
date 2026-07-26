import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import prisma from '../prismaClient.js';
import { createCustomerConversation } from '../controllers/supportConversation.controller.js';
import { requirePermission } from '../middlewares/permission.middleware.js';
import {
  SupportConversationError,
  acceptConversation,
  assignConversation,
  closeConversation,
  createOrGetCustomerConversation,
  getCustomerConversation,
  getStaffConversation,
  listEligibleSupportAssignees,
  reopenConversation
} from '../services/supportConversation.service.js';
import { assertTestDatabaseEnvironment } from './testDatabaseEnvironment.js';

const suffix = crypto.randomUUID();
const email = (name) => `c2-${name}-${suffix}@example.test`;
const users = {};
const userContext = (user) => ({ id: user.id, role: user.role });

const expectSupportError = async (promise, code, status) => {
  await assert.rejects(promise, (error) => (
    error instanceof SupportConversationError && error.code === code && error.status === status
  ));
};

test.before(async () => {
  assertTestDatabaseEnvironment();
  const permission = await prisma.permission.findUnique({ where: { key: 'support_conversation.reply' } });
  assert.ok(permission, 'C2 reply permission must be seeded before support conversation tests run');
  for (const [name, role] of Object.entries({ customer: 'customer', otherCustomer: 'customer', staffOne: 'staff', staffTwo: 'staff', staffNoPermission: 'staff', admin: 'admin' })) {
    users[name] = await prisma.user.create({
      data: {
        fullName: `C2 ${name}`,
        email: email(name),
        role,
        isActive: true,
        ...(role === 'staff' && name !== 'staffNoPermission'
          ? { userPermissions: { create: { permissionId: permission.id } } }
          : {})
      }
    });
  }
});

test.after(async () => {
  const ids = Object.values(users).map((user) => user.id);
  if (ids.length) {
    await prisma.conversation.deleteMany({ where: { customerId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }
  const remaining = await prisma.user.count({ where: { email: { contains: suffix } } });
  assert.equal(remaining, 0, 'support conversation test fixtures must be cleaned up');
  await prisma.$disconnect();
});

test('customer create returns the same single open conversation on a duplicate request', async () => {
  const first = await createOrGetCustomerConversation(userContext(users.customer));
  const second = await createOrGetCustomerConversation(userContext(users.customer));

  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(second.dto.id, first.dto.id);
  assert.equal(first.dto.status, 'WAITING');
  assert.equal(first.dto.assignedStaff, null);
});

test('customer ownership and staff assignment failures are masked as not found', async () => {
  const conversation = await createOrGetCustomerConversation(userContext(users.otherCustomer));

  await expectSupportError(
    getCustomerConversation(userContext(users.customer), conversation.dto.id),
    'CONVERSATION_NOT_FOUND',
    404
  );

  await assignConversation(userContext(users.admin), conversation.dto.id, users.staffOne.id);
  await expectSupportError(
    getStaffConversation(userContext(users.staffTwo), conversation.dto.id),
    'CONVERSATION_NOT_FOUND',
    404
  );
});

test('only one concurrent accept succeeds and the other receives an assignment conflict', async () => {
  const customer = await prisma.user.create({
    data: { fullName: 'C2 accept race', email: email('accept-race'), role: 'customer', isActive: true }
  });
  try {
    const conversation = await createOrGetCustomerConversation(userContext(customer));
    const results = await Promise.allSettled([
      acceptConversation(userContext(users.staffOne), conversation.dto.id),
      acceptConversation(userContext(users.staffTwo), conversation.dto.id)
    ]);
    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
    const rejected = results.find((result) => result.status === 'rejected');
    assert.ok(rejected && rejected.reason instanceof SupportConversationError);
    assert.equal(rejected.reason.code, 'CONVERSATION_ALREADY_ASSIGNED');
    assert.equal(rejected.reason.status, 409);
  } finally {
    await prisma.conversation.deleteMany({ where: { customerId: customer.id } });
    await prisma.user.delete({ where: { id: customer.id } });
  }
});

test('admin assigns waiting conversations, reassigns active conversations, and staff closes only its own assignment', async () => {
  const customer = await prisma.user.create({
    data: { fullName: 'C2 assignment', email: email('assignment'), role: 'customer', isActive: true }
  });
  try {
    const created = await createOrGetCustomerConversation(userContext(customer));
    const assigned = await assignConversation(userContext(users.admin), created.dto.id, users.staffOne.id);
    assert.equal(assigned.status, 'ACTIVE');
    assert.equal(assigned.assignedStaff.id, users.staffOne.id);

    const reassigned = await assignConversation(userContext(users.admin), created.dto.id, users.staffTwo.id);
    assert.equal(reassigned.assignedStaff.id, users.staffTwo.id);

    await expectSupportError(closeConversation(userContext(users.staffOne), created.dto.id), 'CONVERSATION_NOT_FOUND', 404);
    const closed = await closeConversation(userContext(users.staffTwo), created.dto.id);
    assert.equal(closed.status, 'CLOSED');
    assert.equal(closed.closedById, users.staffTwo.id);
  } finally {
    await prisma.conversation.deleteMany({ where: { customerId: customer.id } });
    await prisma.user.delete({ where: { id: customer.id } });
  }
});

test('eligible support assignees are active administrators or reply-authorized staff with a minimal deterministic DTO', async () => {
  const [inactiveAdmin, inactiveStaff] = await Promise.all([
    prisma.user.create({ data: { fullName: 'C2 inactive admin', email: email('inactive-admin'), role: 'admin', isActive: false } }),
    prisma.user.create({ data: { fullName: 'C2 inactive staff', email: email('inactive-staff'), role: 'staff', isActive: false } })
  ]);

  try {
    const assignees = await listEligibleSupportAssignees(userContext(users.admin));
    const ids = new Set(assignees.map((assignee) => assignee.id));

    assert.ok(ids.has(users.admin.id));
    assert.ok(ids.has(users.staffOne.id));
    assert.ok(ids.has(users.staffTwo.id));
    assert.ok(!ids.has(users.staffNoPermission.id));
    assert.ok(!ids.has(users.customer.id));
    assert.ok(!ids.has(inactiveAdmin.id));
    assert.ok(!ids.has(inactiveStaff.id));
    assignees.forEach((assignee) => {
      assert.deepEqual(Object.keys(assignee).sort(), ['email', 'fullName', 'id', 'role']);
    });
    assert.deepEqual(
      assignees.map((assignee) => `${assignee.fullName}\u0000${assignee.email}\u0000${assignee.id}`),
      [...assignees]
        .sort((left, right) => left.fullName.localeCompare(right.fullName) || left.email.localeCompare(right.email) || left.id - right.id)
        .map((assignee) => `${assignee.fullName}\u0000${assignee.email}\u0000${assignee.id}`)
    );
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: [inactiveAdmin.id, inactiveStaff.id] } } });
  }
});

test('assignment revalidates a previously listed staff member when their eligibility becomes stale', async () => {
  const customer = await prisma.user.create({
    data: { fullName: 'C2 stale assignee', email: email('stale-assignee'), role: 'customer', isActive: true }
  });

  try {
    const assignees = await listEligibleSupportAssignees(userContext(users.admin));
    assert.ok(assignees.some((assignee) => assignee.id === users.staffTwo.id));

    await prisma.user.update({ where: { id: users.staffTwo.id }, data: { isActive: false } });
    const conversation = await createOrGetCustomerConversation(userContext(customer));
    await expectSupportError(
      assignConversation(userContext(users.admin), conversation.dto.id, users.staffTwo.id),
      'STAFF_NOT_ELIGIBLE',
      422
    );
  } finally {
    await prisma.user.update({ where: { id: users.staffTwo.id }, data: { isActive: true } });
    await prisma.conversation.deleteMany({ where: { customerId: customer.id } });
    await prisma.user.delete({ where: { id: customer.id } });
  }
});

test('admin reopens a closed conversation only when the customer has no other open conversation', async () => {
  const customer = await prisma.user.create({
    data: { fullName: 'C2 reopen', email: email('reopen'), role: 'customer', isActive: true }
  });
  try {
    const created = await createOrGetCustomerConversation(userContext(customer));
    await assignConversation(userContext(users.admin), created.dto.id, users.staffOne.id);
    await closeConversation(userContext(users.admin), created.dto.id);
    const reopened = await reopenConversation(userContext(users.admin), created.dto.id);
    assert.equal(reopened.status, 'WAITING');
    assert.equal(reopened.assignedStaff, null);

    await expectSupportError(reopenConversation(userContext(users.admin), created.dto.id), 'INVALID_CONVERSATION_TRANSITION', 409);
  } finally {
    await prisma.conversation.deleteMany({ where: { customerId: customer.id } });
    await prisma.user.delete({ where: { id: customer.id } });
  }
});

test('reopen preserves the one-open-conversation invariant and close rejects WAITING', async () => {
  const customer = await prisma.user.create({
    data: { fullName: 'C2 reopen conflict', email: email('reopen-conflict'), role: 'customer', isActive: true }
  });
  try {
    const closed = await prisma.conversation.create({ data: { customerId: customer.id, status: 'CLOSED' } });
    await prisma.conversation.create({ data: { customerId: customer.id, status: 'WAITING' } });
    await expectSupportError(
      reopenConversation(userContext(users.admin), closed.id),
      'CUSTOMER_ALREADY_HAS_OPEN_CONVERSATION',
      409
    );

    const waiting = await createOrGetCustomerConversation(userContext(users.customer));
    await expectSupportError(
      closeConversation(userContext(users.admin), waiting.dto.id),
      'INVALID_CONVERSATION_TRANSITION',
      409
    );
  } finally {
    await prisma.conversation.deleteMany({ where: { customerId: customer.id } });
    await prisma.user.delete({ where: { id: customer.id } });
  }
});

test('database filtered unique index rejects a second open conversation but permits a closed history row', async () => {
  const customer = await prisma.user.create({
    data: { fullName: 'C2 filtered index', email: email('filtered-index'), role: 'customer', isActive: true }
  });
  try {
    const closed = await prisma.conversation.create({ data: { customerId: customer.id, status: 'CLOSED' } });
    const waiting = await prisma.conversation.create({ data: { customerId: customer.id, status: 'WAITING' } });
    assert.ok(closed.id > 0 && waiting.id > 0);
    await assert.rejects(
      prisma.conversation.create({ data: { customerId: customer.id, status: 'ACTIVE' } }),
      (error) => error?.code === 'P2002'
    );
  } finally {
    await prisma.conversation.deleteMany({ where: { customerId: customer.id } });
    await prisma.user.delete({ where: { id: customer.id } });
  }
});

test('permission middleware denies a staff user without the required C2 permission using the C2 error envelope', async () => {
  const middleware = requirePermission('support_conversation.read');
  const req = { user: userContext(users.staffNoPermission), supportConversationErrorEnvelope: true, headers: {} };
  let response;
  const res = {
    status: (status) => ({ json: (body) => { response = { status, body }; return body; } })
  };
  await middleware(req, res, () => assert.fail('permission middleware must not call next'));
  assert.equal(response.status, 403);
  assert.equal(response.body.error.code, 'FORBIDDEN');
  assert.ok(response.body.requestId);
});

test('customer create rejects client-supplied actor fields before service access', async () => {
  let response;
  const req = {
    user: userContext(users.customer),
    body: { customerId: users.otherCustomer.id },
    headers: {},
    method: 'POST',
    path: '/api/support/conversations'
  };
  const res = {
    status: (status) => ({ json: (body) => { response = { status, body }; return body; } })
  };
  await createCustomerConversation(req, res);
  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
});
