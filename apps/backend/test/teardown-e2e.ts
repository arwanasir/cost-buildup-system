import { Client } from 'pg';

const TEST_DATABASE_PREFIX = 'costbuildup_e2e_';

export default async () => {
  const value = process.env.E2E_DATABASE_URL;
  if (!value || process.env.E2E_ALLOW_DATABASE_RESET !== 'true') return;

  const testUrl = new URL(value);
  const databaseName = decodeURIComponent(testUrl.pathname.slice(1));
  if (!new RegExp(`^${TEST_DATABASE_PREFIX}[a-z0-9_]+$`).test(databaseName)) {
    return;
  }

  const adminUrl = new URL(testUrl);
  adminUrl.pathname = '/postgres';
  adminUrl.search = '';
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
    console.log(`[e2e-teardown] Removed isolated database ${databaseName}.`);
  } finally {
    await client.end();
  }
};
