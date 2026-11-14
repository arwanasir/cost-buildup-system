import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const databaseUrl =
  process.env.DATABASE_URL ??
  'postgresql://cost_buildup_user:password@localhost:5432/cost_buildup_db';
const parsedDatabaseUrl = new URL(databaseUrl);
const production = process.env.NODE_ENV === 'production';

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: production
    ? {
        host: parsedDatabaseUrl.hostname,
        port: Number(parsedDatabaseUrl.port || 5432),
        user: decodeURIComponent(parsedDatabaseUrl.username),
        password: decodeURIComponent(parsedDatabaseUrl.password),
        database: decodeURIComponent(parsedDatabaseUrl.pathname.slice(1)),
        ssl: { rejectUnauthorized: true, minVersion: 'TLSv1.3' },
      }
    : { url: databaseUrl },
  strict: true,
  verbose: true,
});
