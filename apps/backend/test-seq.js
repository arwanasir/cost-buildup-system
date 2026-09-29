require('dotenv').config();
const { Pool } = require('pg');
const { drizzle } = require('drizzle-orm/node-postgres');
const { sql } = require('drizzle-orm');

async function test() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  await db.execute(sql`CREATE SEQUENCE IF NOT EXISTS test_seq START 1`);
  const result = await db.execute(sql`SELECT nextval('test_seq')`);
  
  console.log(JSON.stringify(result));
  process.exit(0);
}
test();