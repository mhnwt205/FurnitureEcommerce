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

test('database guard rejects the development target even when the connection string formatting differs', () => {
  const developmentUrl = 'sqlserver://local-user:dev-password@localhost\\SQLEXPRESS;database=FurnitureEcommerceDB_Test;encrypt=true';
  assertRejected({ NODE_ENV: 'test', TEST_DATABASE_URL: developmentUrl, DATABASE_URL: developmentUrl }, 'same SQL Server database');
  assertRejected({ NODE_ENV: 'test', TEST_DATABASE_URL: 'sqlserver://LOCALHOST\\sqlexpress;database=furnitureecommerceDB_test;encrypt=true', DATABASE_URL: developmentUrl }, 'same SQL Server database');
});

test('database guard rejects malformed, production-like, and non-test database names', () => {
  assertRejected({ NODE_ENV: 'test', TEST_DATABASE_URL: 'not-a-sqlserver-url' }, 'parseable SQL Server');
  assertRejected({ NODE_ENV: 'test', TEST_DATABASE_URL: 'sqlserver://localhost;database=Production_test' }, 'production-like');
  assertRejected({ NODE_ENV: 'test', TEST_DATABASE_URL: 'sqlserver://localhost;database=FurnitureEcommerce' }, 'must contain');
  assertRejected({ NODE_ENV: 'test', TEST_DATABASE_URL: 'sqlserver://localhost;database=FurnitureEcommerce_test] ;DROP DATABASE [x' }, 'only letters');
});

test('database guard accepts an explicitly named SQL Server test database without exposing credentials', () => {
  const target = validateTestDatabaseEnvironment({ NODE_ENV: 'test', TEST_DATABASE_URL: safeTestUrl, DATABASE_URL: 'sqlserver://test-user:sensitive-password@localhost\\SQLEXPRESS;database=FurnitureEcommerceDB;encrypt=true' });
  assert.equal(target.databaseName, 'FurnitureEcommerce_test');
  assert.equal(target.host, 'localhost\\SQLEXPRESS');
  assert.equal(Object.values(target).some((value) => String(value).includes('sensitive-password')), false);
});

test('database guard accepts the dedicated FurnitureEcommerceDB_Test target and never includes credentials in errors', () => {
  const target = validateTestDatabaseEnvironment({ NODE_ENV: 'test', TEST_DATABASE_URL: 'sqlserver://test-user:sensitive-password@localhost;database=FurnitureEcommerceDB_Test;encrypt=true', DATABASE_URL: 'sqlserver://test-user:sensitive-password@localhost;database=FurnitureEcommerceDB;encrypt=true' });
  assert.equal(target.databaseName, 'FurnitureEcommerceDB_Test');
});

test('database guard compares the preserved development target when Prisma DATABASE_URL is replaced for tests', () => {
  const testUrl = 'sqlserver://test-user:sensitive-password@localhost;database=FurnitureEcommerceDB_Test;encrypt=true';
  const target = validateTestDatabaseEnvironment({ NODE_ENV: 'test', TEST_DATABASE_URL: testUrl, DATABASE_URL: testUrl, TEST_DATABASE_DEVELOPMENT_URL: 'sqlserver://test-user:sensitive-password@localhost;database=FurnitureEcommerceDB;encrypt=true' });
  assert.equal(target.databaseName, 'FurnitureEcommerceDB_Test');
});
