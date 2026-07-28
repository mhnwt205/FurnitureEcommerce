import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { validateTestDatabaseEnvironment } from './testDatabaseEnvironment.js';

dotenv.config({ path: '.env.test', quiet: true });
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
dotenv.config({ quiet: true });

const run = (command, args, options) => new Promise((resolve, reject) => {
  const child = spawn(command, args, options);
  child.once('error', reject);
  child.once('exit', (code, signal) => {
    if (code === 0 && !signal) return resolve();
    return reject(new Error(`Command failed: ${command} ${args.join(' ')}`));
  });
});

const databaseUrlFor = (sourceUrl, database) => sourceUrl.replace(/(database=)[^;]*/i, `$1${database}`);

const provision = async () => {
  const { databaseName } = validateTestDatabaseEnvironment({
    ...process.env,
    NODE_ENV: 'test',
    TEST_DATABASE_URL: testDatabaseUrl
  });
  const admin = new PrismaClient({ datasources: { db: { url: databaseUrlFor(testDatabaseUrl, 'master') } } });
  try {
    const rows = await admin.$queryRawUnsafe(`SELECT DB_ID(N'${databaseName}') AS id`);
    if (!rows[0]?.id) await admin.$executeRawUnsafe(`CREATE DATABASE [${databaseName}]`);
  } finally {
    await admin.$disconnect();
  }
};

try {
  await provision();
  await run(process.execPath, [fileURLToPath(new URL('../node_modules/prisma/build/index.js', import.meta.url)), 'migrate', 'deploy'], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'test', TEST_DATABASE_URL: testDatabaseUrl, DATABASE_URL: testDatabaseUrl }
  });
} catch (error) {
  console.error(`Backend test database preparation failed: ${error.message}`);
  process.exitCode = 1;
}
