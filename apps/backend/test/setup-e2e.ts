import { Client } from 'pg';
import { execSync } from 'child_process';
import * as path from 'path';

export default async () => {
  console.log('\n[e2e-setup] Setting up costbuildup_test database...');

  // Connect to default 'postgres' database to create the test database
  const client = new Client({
    connectionString:
      'postgresql://cost_buildup_user:password@localhost:5432/postgres',
  });

  await client.connect();

  try {
    // Terminate existing connections to test DB before dropping
    await client.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = 'costbuildup_test'
      AND pid <> pg_backend_pid();
    `);
    await client.query('DROP DATABASE IF EXISTS costbuildup_test');
    await client.query('CREATE DATABASE costbuildup_test');
    console.log('[e2e-setup] Database created.');
  } catch (error) {
    console.error('[e2e-setup] Error creating database:', error);
    throw error;
  } finally {
    await client.end();
  }

  // Set the environment variable for child processes and dynamic imports
  const testDbUrl =
    'postgresql://cost_buildup_user:password@localhost:5432/costbuildup_test';
  process.env.DATABASE_URL = testDbUrl;
  process.env.SEED_DATABASE_URL = testDbUrl;
  process.env.DRIZZLE_DATABASE_URL = testDbUrl;

  console.log('[e2e-setup] Running migrations...');
  const rootDir = path.resolve(__dirname, '..');

  try {
    execSync('npx drizzle-kit migrate', {
      env: { ...process.env, DATABASE_URL: testDbUrl },
      stdio: 'inherit',
      cwd: rootDir,
    });
  } catch (error) {
    console.error('[e2e-setup] Migration failed', error);
    throw error;
  }

  console.log('[e2e-setup] Seeding reference data...');

  try {
    execSync('npx ts-node test/seed-e2e-runner.ts', {
      env: {
        ...process.env,
        DATABASE_URL: testDbUrl,
        SEED_DATABASE_URL: testDbUrl,
        DRIZZLE_DATABASE_URL: testDbUrl,
      },
      stdio: 'inherit',
      cwd: rootDir,
    });
    console.log('[e2e-setup] Seeding completed.\n');
  } catch (error) {
    console.error('[e2e-setup] Seeding failed', error);
    throw error;
  }
};
