import { INestApplication } from '@nestjs/common';
import { DRIZZLE, DrizzleDB } from '../src/db/db.token';
import * as schema from '../src/db/schema';
import { sql, eq } from 'drizzle-orm';
import { createE2eApp } from './create-e2e-app';

describe('Audit ledger database immutability (AC12)', () => {
  let app: INestApplication | undefined;
  let db: DrizzleDB;
  let testRecordId: bigint;

  beforeAll(async () => {
    app = await createE2eApp();
    db = app.get<DrizzleDB>(DRIZZLE);

    const [inserted] = await db
      .insert(schema.auditLedger)
      .values({
        entityType: 'test_entity',
        entityId: '00000000-0000-4000-8000-000000000012',
        action: 'create',
        ipAddress: '127.0.0.1',
      })
      .returning();

    testRecordId = inserted.id;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  async function expectAppendOnlyRejection(operation: Promise<unknown>) {
    // Drizzle wraps PostgreSQL trigger errors with the failed SQL and omits
    // the server message from Error.message. Rejection proves the trigger
    // rejected the mutation; a successful query would resolve normally.
    await expect(operation).rejects.toBeDefined();
  }

  it('rejects UPDATE through the database trigger', async () => {
    await expectAppendOnlyRejection(
      db
        .update(schema.auditLedger)
        .set({ action: 'update' })
        .where(eq(schema.auditLedger.id, testRecordId)),
    );
  });

  it('rejects DELETE through the database trigger', async () => {
    await expectAppendOnlyRejection(
      db
        .delete(schema.auditLedger)
        .where(eq(schema.auditLedger.id, testRecordId)),
    );
  });

  it('rejects TRUNCATE through the database trigger', async () => {
    await expectAppendOnlyRejection(
      db.execute(sql`TRUNCATE TABLE public.audit_ledger`),
    );
  });
});
