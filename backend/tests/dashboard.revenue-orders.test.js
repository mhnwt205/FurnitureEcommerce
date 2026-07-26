import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import express from 'express';
import test from 'node:test';
import prisma from '../prismaClient.js';
import dashboardRoutes from '../routes/dashboard.routes.js';
import { signAccessToken } from '../utils/tokenService.js';
import { assertTestDatabaseEnvironment } from './testDatabaseEnvironment.js';

const suffix = crypto.randomUUID();
const users = {};
const orderIds = [];
let nextFixtureIndex = 1;
let server;

const email = (name) => `revenue-orders-${name}-${suffix}@example.test`;
const tokenFor = (user) => signAccessToken({ user });
const headersFor = (user) => ({ Authorization: `Bearer ${tokenFor(user)}` });

const startServer = async () => {
  const app = express();
  app.use('/api/dashboard', dashboardRoutes);
  const instance = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  const { port } = instance.address();
  return {
    request: (path, options = {}) => fetch(`http://127.0.0.1:${port}${path}`, options),
    close: () => new Promise((resolve, reject) => instance.close((error) => (error ? reject(error) : resolve())))
  };
};

const createOrder = async ({
  name,
  status = 'pending',
  paymentStatus = 'paid',
  paidAt = new Date('2026-06-15T10:00:00.000Z'),
  createdAt = new Date('2026-01-01T09:00:00.000Z'),
  totalAmount = 100_000
} = {}) => {
  const fixtureIndex = nextFixtureIndex;
  nextFixtureIndex += 1;

  const order = await prisma.order.create({
    data: {
      orderCode: `REV-${suffix.slice(0, 8)}-${fixtureIndex}`,
      customerEmail: `${name || 'customer'}-${suffix}@example.test`,
      fullName: name || `Revenue customer ${fixtureIndex}`,
      phone: `090${String(fixtureIndex).padStart(7, '0')}`,
      address: 'Revenue test address',
      paymentMethod: 'VNPAY',
      totalAmount,
      status,
      paymentStatus,
      paidAt,
      createdAt
    }
  });
  orderIds.push(order.id);
  return order;
};

const requestRevenueOrders = ({ from = '2026-06-01T00:00:00.000Z', to = '2026-06-30T23:59:59.999Z', ...query } = {}, user = users.admin) => {
  const params = new URLSearchParams({ from, to, ...Object.fromEntries(Object.entries(query).map(([key, value]) => [key, String(value)])) });
  return server.request(`/api/dashboard/revenue/orders?${params.toString()}`, { headers: headersFor(user) });
};

const requestRevenue = ({ from = '2026-06-01T00:00:00.000Z', to = '2026-06-30T23:59:59.999Z', ...query } = {}, user = users.admin) => {
  const params = new URLSearchParams({ from, to, ...Object.fromEntries(Object.entries(query).map(([key, value]) => [key, String(value)])) });
  return server.request(`/api/dashboard/revenue?${params.toString()}`, { headers: headersFor(user) });
};

test.before(async () => {
  assertTestDatabaseEnvironment();
  const dashboardPermission = await prisma.permission.findUnique({ where: { key: 'dashboard.view' } });
  assert.ok(dashboardPermission, 'dashboard.view must be seeded before dashboard integration tests run');

  users.admin = await prisma.user.create({ data: { fullName: 'Revenue orders admin', email: email('admin'), role: 'admin', isActive: true } });
  users.staffWithPermission = await prisma.user.create({
    data: {
      fullName: 'Revenue orders staff',
      email: email('staff-permitted'),
      role: 'staff',
      isActive: true,
      userPermissions: { create: { permissionId: dashboardPermission.id } }
    }
  });
  users.staffWithoutPermission = await prisma.user.create({ data: { fullName: 'Revenue orders denied staff', email: email('staff-denied'), role: 'staff', isActive: true } });

  server = await startServer();
});

test.after(async () => {
  try {
    if (server) await server.close();
    if (orderIds.length) await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    const userIds = Object.values(users).map((user) => user.id);
    if (userIds.length) await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    assert.equal(await prisma.order.count({ where: { orderCode: { contains: suffix.slice(0, 8) } } }), 0, 'revenue-order fixtures must be cleaned up');
    assert.equal(await prisma.user.count({ where: { email: { contains: suffix } } }), 0, 'revenue-order user fixtures must be cleaned up');
  } finally {
    await prisma.$disconnect();
  }
});

test('dashboard revenue orders preserves authorization middleware behavior', async () => {
  const unauthenticated = await server.request('/api/dashboard/revenue/orders?from=2026-06-01T00%3A00%3A00.000Z&to=2026-06-30T23%3A59%3A59.999Z');
  assert.equal(unauthenticated.status, 401);

  const denied = await requestRevenueOrders({}, users.staffWithoutPermission);
  assert.equal(denied.status, 403);

  const admin = await requestRevenueOrders();
  assert.equal(admin.status, 200);

  const permittedStaff = await requestRevenueOrders({}, users.staffWithPermission);
  assert.equal(permittedStaff.status, 200);
});

test('dashboard revenue orders validates range, status, page, and limit inputs', async () => {
  const invalidRequests = [
    ['missing from', '/api/dashboard/revenue/orders?to=2026-06-30T23%3A59%3A59.999Z'],
    ['missing to', '/api/dashboard/revenue/orders?from=2026-06-01T00%3A00%3A00.000Z'],
    ['invalid date', '/api/dashboard/revenue/orders?from=nope&to=2026-06-30T23%3A59%3A59.999Z'],
    ['reversed range', '/api/dashboard/revenue/orders?from=2026-06-30T00%3A00%3A00.000Z&to=2026-06-01T00%3A00%3A00.000Z'],
    ['range over 366 days', '/api/dashboard/revenue/orders?from=2025-01-01T00%3A00%3A00.000Z&to=2026-01-02T00%3A00%3A00.000Z'],
    ['unknown status', '/api/dashboard/revenue/orders?from=2026-06-01T00%3A00%3A00.000Z&to=2026-06-30T23%3A59%3A59.999Z&status=unknown'],
    ['zero page', '/api/dashboard/revenue/orders?from=2026-06-01T00%3A00%3A00.000Z&to=2026-06-30T23%3A59%3A59.999Z&page=0'],
    ['negative page', '/api/dashboard/revenue/orders?from=2026-06-01T00%3A00%3A00.000Z&to=2026-06-30T23%3A59%3A59.999Z&page=-1'],
    ['decimal page', '/api/dashboard/revenue/orders?from=2026-06-01T00%3A00%3A00.000Z&to=2026-06-30T23%3A59%3A59.999Z&page=1.5'],
    ['mixed page', '/api/dashboard/revenue/orders?from=2026-06-01T00%3A00%3A00.000Z&to=2026-06-30T23%3A59%3A59.999Z&page=1abc'],
    ['zero limit', '/api/dashboard/revenue/orders?from=2026-06-01T00%3A00%3A00.000Z&to=2026-06-30T23%3A59%3A59.999Z&limit=0'],
    ['negative limit', '/api/dashboard/revenue/orders?from=2026-06-01T00%3A00%3A00.000Z&to=2026-06-30T23%3A59%3A59.999Z&limit=-1'],
    ['decimal limit', '/api/dashboard/revenue/orders?from=2026-06-01T00%3A00%3A00.000Z&to=2026-06-30T23%3A59%3A59.999Z&limit=1.5'],
    ['mixed limit', '/api/dashboard/revenue/orders?from=2026-06-01T00%3A00%3A00.000Z&to=2026-06-30T23%3A59%3A59.999Z&limit=1abc'],
    ['oversized limit', '/api/dashboard/revenue/orders?from=2026-06-01T00%3A00%3A00.000Z&to=2026-06-30T23%3A59%3A59.999Z&limit=51']
  ];

  for (const [label, path] of invalidRequests) {
    const response = await server.request(path, { headers: headersFor(users.admin) });
    const body = await response.json();
    assert.equal(response.status, 400, label);
    assert.equal(typeof body.message, 'string', label);
  }
});

test('dashboard revenue orders filters recognized revenue inclusively, maps minimal DTOs, and accepts each lifecycle status', async () => {
  const fromBoundary = await createOrder({ name: 'Snapshot from boundary', status: 'pending', paidAt: new Date('2026-06-01T00:00:00.000Z'), createdAt: new Date('2025-01-01T00:00:00.000Z'), totalAmount: 101_000 });
  const toBoundary = await createOrder({ name: 'Snapshot to boundary', status: 'completed', paidAt: new Date('2026-06-30T23:59:59.999Z'), totalAmount: 202_000 });
  const samePaidAtFirst = await createOrder({ name: 'Same paid time first', status: 'confirmed', paidAt: new Date('2026-06-20T12:00:00.000Z'), totalAmount: 303_000 });
  const samePaidAtSecond = await createOrder({ name: 'Same paid time second', status: 'confirmed', paidAt: new Date('2026-06-20T12:00:00.000Z'), totalAmount: 404_000 });
  await Promise.all([
    createOrder({ name: 'Preparing eligible', status: 'preparing' }),
    createOrder({ name: 'Shipping eligible', status: 'shipping' }),
    createOrder({ name: 'Delivered eligible', status: 'delivered' }),
    createOrder({ name: 'Cancelled paid eligible', status: 'cancelled' }),
    createOrder({ name: 'Unpaid excluded', paymentStatus: 'unpaid' }),
    createOrder({ name: 'Failed excluded', paymentStatus: 'failed' }),
    createOrder({ name: 'Refunded excluded', paymentStatus: 'refunded' }),
    createOrder({ name: 'Outside paid range excluded', paidAt: new Date('2026-07-01T00:00:00.000Z'), createdAt: new Date('2026-06-15T10:00:00.000Z') })
  ]);

  const allResponse = await requestRevenueOrders({ limit: 50 });
  const allBody = await allResponse.json();
  assert.equal(allResponse.status, 200);
  assert.equal(allBody.pagination.total, 8);
  assert.equal(allBody.pagination.totalPages, 1);
  assert.equal(allBody.pagination.page, 1);
  assert.equal(allBody.pagination.limit, 50);
  assert.ok(allBody.data.some((order) => order.id === fromBoundary.id));
  assert.ok(allBody.data.some((order) => order.id === toBoundary.id));
  assert.ok(!allBody.data.some((order) => order.customerName === 'Unpaid excluded'));
  assert.ok(!allBody.data.some((order) => order.customerName === 'Failed excluded'));
  assert.ok(!allBody.data.some((order) => order.customerName === 'Refunded excluded'));
  assert.ok(!allBody.data.some((order) => order.customerName === 'Outside paid range excluded'));

  for (let index = 1; index < allBody.data.length; index += 1) {
    const previous = allBody.data[index - 1];
    const current = allBody.data[index];
    const previousPaidAt = new Date(previous.paidAt).getTime();
    const currentPaidAt = new Date(current.paidAt).getTime();
    assert.ok(
      previousPaidAt > currentPaidAt || (previousPaidAt === currentPaidAt && previous.id > current.id),
      'rows must be ordered by paidAt DESC, then id DESC'
    );
  }

  const sameTimeIndexes = allBody.data.map((order) => order.id);
  assert.ok(sameTimeIndexes.indexOf(samePaidAtSecond.id) < sameTimeIndexes.indexOf(samePaidAtFirst.id));
  allBody.data.forEach((order) => {
    assert.deepEqual(Object.keys(order).sort(), ['createdAt', 'customerName', 'id', 'orderCode', 'paidAt', 'paymentMethod', 'status', 'totalAmount']);
    assert.equal(typeof order.totalAmount, 'number');
    assert.equal('paymentStatus' in order, false);
    assert.equal('email' in order, false);
    assert.equal('phone' in order, false);
    assert.equal('address' in order, false);
    assert.equal('user' in order, false);
    assert.equal('orderItems' in order, false);
  });
  assert.equal(allBody.data.find((order) => order.id === fromBoundary.id).customerName, 'Snapshot from boundary');

  for (const status of ['all', 'pending', 'confirmed', 'preparing', 'shipping', 'delivered', 'completed', 'cancelled']) {
    const response = await requestRevenueOrders({ status, limit: 50 });
    assert.equal(response.status, 200, status);
    const body = await response.json();
    if (status !== 'all') assert.ok(body.data.every((order) => order.status === status), status);
  }
});

test('dashboard revenue aggregate and table use the identical paid-order dataset for every status filter', async () => {
  const invalidStatus = await requestRevenue({ status: 'unknown' });
  assert.equal(invalidStatus.status, 400);

  for (const status of ['all', 'completed', 'shipping', 'cancelled']) {
    const [aggregateResponse, tableResponse] = await Promise.all([
      requestRevenue({ status }),
      requestRevenueOrders({ status, limit: 50 })
    ]);

    assert.equal(aggregateResponse.status, 200, `aggregate ${status}`);
    assert.equal(tableResponse.status, 200, `table ${status}`);

    const [aggregate, table] = await Promise.all([aggregateResponse.json(), tableResponse.json()]);
    const tableRevenue = table.data.reduce((sum, order) => sum + order.totalAmount, 0);
    const tableSuccessfulOrders = table.data.filter((order) => ['delivered', 'completed'].includes(order.status)).length;
    const tableCancelledOrders = table.data.filter((order) => order.status === 'cancelled').length;

    assert.equal(aggregate.summary.paidOrders, table.pagination.total, `paid order count for ${status}`);
    assert.equal(aggregate.summary.totalRevenue, tableRevenue, `total revenue for ${status}`);
    assert.equal(aggregate.summary.averageOrderValue, table.pagination.total === 0 ? 0 : Number((tableRevenue / table.pagination.total).toFixed(2)), `average order value for ${status}`);
    assert.equal(aggregate.summary.successfulOrders, tableSuccessfulOrders, `successful order count for ${status}`);
    assert.equal(aggregate.summary.cancelledOrders, tableCancelledOrders, `cancelled order count for ${status}`);
    assert.equal(aggregate.chartData.reduce((sum, item) => sum + item.revenue, 0), tableRevenue, `chart revenue for ${status}`);
    assert.equal(aggregate.chartData.reduce((sum, item) => sum + item.orders, 0), table.pagination.total, `chart order count for ${status}`);
    assert.equal(Object.values(aggregate.statusCounts).reduce((sum, count) => sum + count, 0), table.pagination.total, `status distribution total for ${status}`);
    if (status !== 'all') assert.equal(aggregate.statusCounts[status], table.pagination.total, `status distribution for ${status}`);
  }
});

test('dashboard revenue orders uses stable defaults and paginates deterministic paid results', async () => {
  for (let index = 0; index < 5; index += 1) {
    await createOrder({ name: `Pagination ${index}`, status: 'pending', paidAt: new Date(`2026-06-${String(10 + index).padStart(2, '0')}T09:00:00.000Z`) });
  }

  const defaults = await requestRevenueOrders();
  const defaultsBody = await defaults.json();
  assert.equal(defaults.status, 200);
  assert.equal(defaultsBody.pagination.page, 1);
  assert.equal(defaultsBody.pagination.limit, 10);
  assert.equal(defaultsBody.pagination.total, 13);
  assert.equal(defaultsBody.pagination.totalPages, 2);
  assert.equal(defaultsBody.data.length, 10);

  const pageTwo = await requestRevenueOrders({ page: 2, limit: 10 });
  const pageTwoBody = await pageTwo.json();
  assert.equal(pageTwo.status, 200);
  assert.equal(pageTwoBody.data.length, 3);
  assert.equal(pageTwoBody.pagination.total, 13);
  assert.equal(pageTwoBody.pagination.totalPages, 2);
  assert.equal(new Set([...defaultsBody.data, ...pageTwoBody.data].map((order) => order.id)).size, 13);
});
