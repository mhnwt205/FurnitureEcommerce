import { spawn } from 'node:child_process';
import dotenv from 'dotenv';
import { validateTestDatabaseEnvironment } from './testDatabaseEnvironment.js';

// TEST_DATABASE_URL must come from the caller, never from the normal .env file.
const suppliedTestDatabaseUrl = process.env.TEST_DATABASE_URL;
dotenv.config({ quiet: true });

try {
  validateTestDatabaseEnvironment({
    ...process.env,
    NODE_ENV: 'test',
    TEST_DATABASE_URL: suppliedTestDatabaseUrl
  });
  const child = spawn(process.execPath, ['--test', '--test-concurrency=1'], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'test',
      TEST_DATABASE_URL: suppliedTestDatabaseUrl,
      DATABASE_URL: suppliedTestDatabaseUrl
    }
  });
  child.on('error', (error) => {
    console.error(`Unable to start backend tests: ${error.message}`);
    process.exitCode = 1;
  });
  child.on('exit', (code, signal) => {
    process.exitCode = code ?? (signal ? 1 : 0);
  });
} catch (error) {
  console.error(`Backend test configuration rejected: ${error.message}`);
  process.exitCode = 1;
}
