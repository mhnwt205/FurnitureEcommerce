const TEST_DATABASE_NAME = /(?:_test|-test|test_)|test$/i;
const PRODUCTION_LIKE_DATABASE_NAME = /(?:^|[_-])prod(?:uction)?(?:[_-]|$)/i;
const SAFE_DATABASE_NAME = /^[A-Za-z0-9_-]+$/;

export class TestDatabaseEnvironmentError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TestDatabaseEnvironmentError';
  }
}

const parameterValue = (connectionString, names) => {
  const parameters = connectionString.split(';').slice(1);
  for (const parameter of parameters) {
    const separator = parameter.indexOf('=');
    if (separator < 1) continue;
    const name = parameter.slice(0, separator).trim().toLowerCase();
    if (names.includes(name)) return parameter.slice(separator + 1).trim();
  }
  return null;
};

const parseSqlServerTarget = (connectionString) => {
  if (typeof connectionString !== 'string' || connectionString.trim() === '') {
    throw new TestDatabaseEnvironmentError('TEST_DATABASE_URL is required and must not be empty');
  }

  const value = connectionString.trim();
  const authority = /^sqlserver:\/\/([^;/?#]+)/i.exec(value)?.[1];
  if (!authority) {
    throw new TestDatabaseEnvironmentError('TEST_DATABASE_URL must be a parseable SQL Server connection string');
  }

  const databaseName = parameterValue(value, ['database', 'initial catalog']);
  if (!databaseName) {
    throw new TestDatabaseEnvironmentError('TEST_DATABASE_URL must include a SQL Server database name');
  }

  // Strip credentials before returning a host marker for safe diagnostics.
  const host = authority.includes('@') ? authority.slice(authority.lastIndexOf('@') + 1) : authority;
  return { host, databaseName };
};

export const validateTestDatabaseEnvironment = (environment = process.env) => {
  if (environment.NODE_ENV !== 'test') {
    throw new TestDatabaseEnvironmentError('Database-backed tests require NODE_ENV=test');
  }

  const target = parseSqlServerTarget(environment.TEST_DATABASE_URL);
  if (PRODUCTION_LIKE_DATABASE_NAME.test(target.databaseName)) {
    throw new TestDatabaseEnvironmentError(`TEST_DATABASE_URL targets disallowed production-like database "${target.databaseName}"`);
  }
  if (!TEST_DATABASE_NAME.test(target.databaseName)) {
    throw new TestDatabaseEnvironmentError(`TEST_DATABASE_URL database "${target.databaseName}" must contain _test, -test, or test_, or end with test`);
  }
  if (!SAFE_DATABASE_NAME.test(target.databaseName)) {
    throw new TestDatabaseEnvironmentError('TEST_DATABASE_URL database name must contain only letters, numbers, underscores, or hyphens');
  }

  return target;
};

export const assertTestDatabaseEnvironment = () => validateTestDatabaseEnvironment(process.env);
