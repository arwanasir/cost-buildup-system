import { Client } from 'pg';
import { execSync } from 'child_process';
import * as path from 'path';

const TEST_DATABASE_PREFIX = 'costbuildup_e2e_';

function getTestDatabaseUrl(): URL {
  const value = process.env.E2E_DATABASE_URL;
  if (!value) {
    throw new Error(
      'Set E2E_DATABASE_URL to a disposable costbuildup_e2e_* database before running E2E tests.',
    );
  }
  if (process.env.E2E_ALLOW_DATABASE_RESET !== 'true') {
    throw new Error(
      'Set E2E_ALLOW_DATABASE_RESET=true to confirm the dedicated E2E database may be recreated.',
    );
  }

  const testUrl = new URL(value);
  const databaseName = decodeURIComponent(testUrl.pathname.slice(1));
  if (!new RegExp(`^${TEST_DATABASE_PREFIX}[a-z0-9_]+$`).test(databaseName)) {
    throw new Error(
      `Refusing to reset database '${databaseName}'. E2E database names must start with ${TEST_DATABASE_PREFIX}.`,
    );
  }

  return testUrl;
}

export async function prepareE2eDatabase() {
  const testUrl = getTestDatabaseUrl();
  const databaseName = decodeURIComponent(testUrl.pathname.slice(1));
  const adminUrl = new URL(testUrl);
  adminUrl.pathname = '/postgres';
  adminUrl.search = '';

  console.log(`[e2e-setup] Recreating isolated database ${databaseName}...`);
  const client = new Client({ connectionString: adminUrl.toString() });
  await client.connect();

  try {
    await client.query(
      `SELECT pg_terminate_backend(pid)
       FROM pg_stat_activity
       WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [databaseName],
    );
    await client.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
    await client.query(`CREATE DATABASE "${databaseName}"`);
  } finally {
    await client.end();
  }

  const testDbUrl = testUrl.toString();
  process.env.DATABASE_URL = testDbUrl;
  process.env.SEED_DATABASE_URL = testDbUrl;
  process.env.DRIZZLE_DATABASE_URL = testDbUrl;

  const backendRoot = path.resolve(__dirname, '..');
  const childEnv = {
    ...process.env,
    DATABASE_URL: testDbUrl,
    SEED_DATABASE_URL: testDbUrl,
    DRIZZLE_DATABASE_URL: testDbUrl,
  };

  console.log('[e2e-setup] Running migrations and reference seeds...');
  execSync('npm run db:migrate', {
    env: childEnv,
    stdio: 'inherit',
    cwd: backendRoot,
  });
  execSync('npx ts-node test/seed-e2e-runner.ts', {
    env: childEnv,
    stdio: 'inherit',
    cwd: backendRoot,
  });
}

export default async function setupE2e() {
  await prepareE2eDatabase();
}
