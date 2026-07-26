import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import express from 'express';
import test from 'node:test';
import prisma from '../prismaClient.js';
import { signAccessToken } from '../utils/tokenService.js';
import { adminSupportConversationRoutes } from '../routes/supportConversation.routes.js';
import { setPermissionPrismaClientForTests } from '../middlewares/permission.middleware.js';
import { assertTestDatabaseEnvironment } from './testDatabaseEnvironment.js';

const suffix = crypto.randomUUID();
const testUsers = [];
const users = {};

const startServer = async () => {
  const app = express();
  app.use(express.json());
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

const tokenFor = (user) => signAccessToken({ user });

test.before(async () => {
  assertTestDatabaseEnvironment();
  const [replyPermission, assignPermission] = await Promise.all([
    prisma.permission.findUnique({ where: { key: 'support_conversation.reply' } }),
    prisma.permission.findUnique({ where: { key: 'support_conversation.assign' } })
  ]);
  assert.ok(replyPermission && assignPermission, 'C2 support permissions must be seeded before route tests run');

  users.staffWithoutPermission = await prisma.user.create({
    data: {
      fullName: 'C2 middleware permission test',
      email: `c2-middleware-${suffix}@example.test`,
      role: 'staff',
      isActive: true
    }
  });
  users.admin = await prisma.user.create({
    data: { fullName: 'C2 assignee admin', email: `c2-assignee-admin-${suffix}@example.test`, role: 'admin', isActive: true }
  });
  users.eligibleStaff = await prisma.user.create({
    data: {
      fullName: 'C2 assignee eligible',
      email: `c2-assignee-eligible-${suffix}@example.test`,
      role: 'staff',
      isActive: true,
      userPermissions: { create: { permissionId: replyPermission.id } }
    }
  });
  users.staffWithAssignOnly = await prisma.user.create({
    data: {
      fullName: 'C2 assignee assign only',
      email: `c2-assignee-assign-${suffix}@example.test`,
      role: 'staff',
      isActive: true,
      userPermissions: { create: { permissionId: assignPermission.id } }
    }
  });
  users.customer = await prisma.user.create({
    data: { fullName: 'C2 assignee customer', email: `c2-assignee-customer-${suffix}@example.test`, role: 'customer', isActive: true }
  });
  users.inactiveStaff = await prisma.user.create({
    data: {
      fullName: 'C2 assignee inactive',
      email: `c2-assignee-inactive-${suffix}@example.test`,
      role: 'staff',
      isActive: false,
      userPermissions: { create: { permissionId: replyPermission.id } }
    }
  });
  testUsers.push(...Object.values(users));
});

test.after(async () => {
  const ids = testUsers.map((user) => user.id);
  try {
    if (ids.length) await prisma.user.deleteMany({ where: { id: { in: ids } } });
    const remaining = await prisma.user.count({ where: { email: { startsWith: `c2-middleware-${suffix}` } } });
    assert.equal(remaining, 0, 'middleware test fixtures must be cleaned up');
  } finally {
    await prisma.$disconnect();
  }
});

test('support route uses verifyToken and returns the C2 unauthorized envelope for missing authentication', async () => {
  const server = await startServer();
  try {
    const response = await server.request('/api/admin/support/conversations');
    const body = await response.json();
    assert.equal(response.status, 401);
    assert.equal(body.error.code, 'UNAUTHORIZED');
    assert.ok(body.requestId);
  } finally {
    await server.close();
  }
});

test('support route uses real verifyToken and permission middleware for an insufficiently-permitted staff user', async () => {
  const server = await startServer();
  try {
    const response = await server.request('/api/admin/support/conversations', {
      headers: { Authorization: `Bearer ${tokenFor(users.staffWithoutPermission)}` }
    });
    const body = await response.json();
    assert.equal(response.status, 403);
    assert.equal(body.error.code, 'FORBIDDEN');
    assert.ok(body.requestId);
  } finally {
    await server.close();
  }
});

test('permission lookup failures return the C2 internal-error envelope without bypassing the real middleware', async () => {
  const restorePrisma = setPermissionPrismaClientForTests({
    userPermission: { findFirst: async () => { throw new Error('forced permission lookup failure'); } }
  });
  const server = await startServer();
  try {
    const response = await server.request('/api/admin/support/conversations', {
      headers: { Authorization: `Bearer ${tokenFor(users.staffWithoutPermission)}` }
    });
    const body = await response.json();
    assert.equal(response.status, 500);
    assert.equal(body.error.code, 'INTERNAL_SERVER_ERROR');
    assert.ok(body.requestId);
  } finally {
    await server.close();
    restorePrisma();
  }
});

test('support assignee endpoint is static, admin-only, and exposes only eligible minimal DTOs', async () => {
  const server = await startServer();
  try {
    const unauthorized = await server.request('/api/admin/support/conversations/assignees');
    assert.equal(unauthorized.status, 401);
    assert.equal((await unauthorized.json()).error.code, 'UNAUTHORIZED');

    const customer = await server.request('/api/admin/support/conversations/assignees', {
      headers: { Authorization: `Bearer ${tokenFor(users.customer)}` }
    });
    assert.equal(customer.status, 403);
    assert.equal((await customer.json()).error.code, 'FORBIDDEN');

    const staff = await server.request('/api/admin/support/conversations/assignees', {
      headers: { Authorization: `Bearer ${tokenFor(users.staffWithAssignOnly)}` }
    });
    assert.equal(staff.status, 403);
    assert.equal((await staff.json()).error.code, 'FORBIDDEN');

    const response = await server.request('/api/admin/support/conversations/assignees', {
      headers: { Authorization: `Bearer ${tokenFor(users.admin)}` }
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.ok(Array.isArray(body.data));
    const ids = new Set(body.data.map((assignee) => assignee.id));
    assert.ok(ids.has(users.admin.id));
    assert.ok(ids.has(users.eligibleStaff.id));
    assert.ok(!ids.has(users.customer.id));
    assert.ok(!ids.has(users.staffWithAssignOnly.id));
    assert.ok(!ids.has(users.inactiveStaff.id));
    body.data.forEach((assignee) => {
      assert.deepEqual(Object.keys(assignee).sort(), ['email', 'fullName', 'id', 'role']);
      assert.equal('phone' in assignee, false);
      assert.equal('userPermissions' in assignee, false);
      assert.equal('passwordHash' in assignee, false);
    });
  } finally {
    await server.close();
  }
});
