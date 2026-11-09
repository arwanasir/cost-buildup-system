import { execSync } from 'child_process';
import path from 'node:path';

export default async function globalSetup() {
  const databaseUrl = process.env.E2E_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      'Set E2E_DATABASE_URL to a disposable costbuildup_e2e_* database before running browser e2e tests.',
    );
  }
  if (process.env.E2E_ALLOW_DATABASE_RESET !== 'true') {
    throw new Error(
      'Set E2E_ALLOW_DATABASE_RESET=true to confirm the dedicated e2e database may be recreated.',
    );
  }

  const databaseName = decodeURIComponent(new URL(databaseUrl).pathname.slice(1));
  if (!/^costbuildup_e2e_[a-z0-9_]+$/.test(databaseName)) {
    throw new Error(
      `Refusing to use database '${databaseName}'. E2E database names must start with costbuildup_e2e_.`,
    );
  }

  const backendRoot = path.resolve(process.cwd(), '../backend');
  const childEnv = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    SEED_DATABASE_URL: databaseUrl,
    DRIZZLE_DATABASE_URL: databaseUrl,
  };

  console.log(`[e2e-setup] Seeding demo records in ${databaseName}...`);
  execSync('npm run db:seed:demo', {
    cwd: backendRoot,
    env: childEnv,
    stdio: 'inherit',
  });
}
