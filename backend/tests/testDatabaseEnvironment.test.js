import assert from 'node:assert/strict';
import test from 'node:test';
import { TestDatabaseEnvironmentError, validateTestDatabaseEnvironment } from './testDatabaseEnvironment.js';

const safeTestUrl = 'sqlserver://test-user:sensitive-password@localhost\\SQLEXPRESS;database=FurnitureEcommerce_test;encrypt=true';

const assertRejected = (environment, expectedText) => {
  assert.throws(
    () => validateTestDatabaseEnvironment(environment),
    (error) => error instanceof TestDatabaseEnvironmentError && error.message.includes(expectedText)
  );
};

test('database guard rejects NODE_ENV values other than test without exposing credentials', () => {
  try {
    validateTestDatabaseEnvironment({ NODE_ENV: 'development', TEST_DATABASE_URL: safeTestUrl });
    assert.fail('Expected a rejected database environment');
  } catch (error) {
    assert.ok(error.message.includes('NODE_ENV=test'));
    assert.equal(error.message.includes('sensitive-password'), false);
  }
});

test('database guard rejects missing and empty TEST_DATABASE_URL', () => {
  assertRejected({ NODE_ENV: 'test' }, 'required');
  assertRejected({ NODE_ENV: 'test', TEST_DATABASE_URL: '   ' }, 'required');
});

test('database guard rejects malformed, production-like, and non-test database names', () => {
  assertRejected({ NODE_ENV: 'test', TEST_DATABASE_URL: 'not-a-sqlserver-url' }, 'parseable SQL Server');
  assertRejected({ NODE_ENV: 'test', TEST_DATABASE_URL: 'sqlserver://localhost;database=Production_test' }, 'production-like');
  assertRejected({ NODE_ENV: 'test', TEST_DATABASE_URL: 'sqlserver://localhost;database=FurnitureEcommerce' }, 'must contain');
});

test('database guard accepts an explicitly named SQL Server test database without exposing credentials', () => {
  const target = validateTestDatabaseEnvironment({ NODE_ENV: 'test', TEST_DATABASE_URL: safeTestUrl });
  assert.equal(target.databaseName, 'FurnitureEcommerce_test');
  assert.equal(target.host, 'localhost\\SQLEXPRESS');
  assert.equal(Object.values(target).some((value) => String(value).includes('sensitive-password')), false);
});
