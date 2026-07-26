import assert from 'node:assert/strict';
import test from 'node:test';
import { requirePermission, setPermissionPrismaClientForTests } from '../middlewares/permission.middleware.js';

const createResponse = () => {
  let response;
  return {
    res: { status: (status) => ({ json: (body) => { response = { status, body }; return body; } }) },
    result: () => response
  };
};

const runMiddleware = async (middleware, req) => {
  const response = createResponse();
  await middleware(req, response.res, () => assert.fail('middleware must not call next'));
  return response.result();
};

test('permission middleware returns UNAUTHORIZED for C2 requests without authentication', async () => {
  const result = await runMiddleware(requirePermission('support_conversation.read'), {
    supportConversationErrorEnvelope: true,
    headers: {}
  });
  assert.equal(result.status, 401);
  assert.equal(result.body.error.code, 'UNAUTHORIZED');
  assert.ok(result.body.requestId);
});

test('permission middleware returns FORBIDDEN for C2 customer requests', async () => {
  const result = await runMiddleware(requirePermission('support_conversation.read'), {
    user: { id: 1, role: 'customer' },
    supportConversationErrorEnvelope: true,
    headers: {}
  });
  assert.equal(result.status, 403);
  assert.equal(result.body.error.code, 'FORBIDDEN');
  assert.ok(result.body.requestId);
});

test('permission middleware returns INTERNAL_SERVER_ERROR for C2 permission lookup failures', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  const restorePrisma = setPermissionPrismaClientForTests({
    userPermission: { findFirst: async () => { throw new Error('forced lookup failure'); } }
  });
  try {
    const result = await runMiddleware(requirePermission('support_conversation.read'), {
      user: { id: 1, role: 'staff' },
      supportConversationErrorEnvelope: true,
      headers: {}
    });
    assert.equal(result.status, 500);
    assert.equal(result.body.error.code, 'INTERNAL_SERVER_ERROR');
    assert.ok(result.body.requestId);
    assert.equal(result.body.error.message.includes('forced lookup failure'), false);
  } finally {
    restorePrisma();
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});

test('permission middleware retains the legacy response shape without the C2 envelope flag', async () => {
  const result = await runMiddleware(requirePermission('support_conversation.read'), { headers: {} });
  assert.equal(result.status, 401);
  assert.deepEqual(result.body, { message: 'Unauthorized' });
});
