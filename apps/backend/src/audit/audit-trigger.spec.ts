import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseModule } from '@/db/db.module';
import { DRIZZLE, DrizzleDB } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ConfigModule } from '@nestjs/config';

describe.skip('Audit Ledger Database Trigger (Integration) - AC12', () => {
  let db: DrizzleDB;
  let module: TestingModule;
  let testRecordId: any;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), DatabaseModule],
    }).compile();

    db = module.get<DrizzleDB>(DRIZZLE);

    const [inserted] = await db
      .insert(schema.auditLedger)
      .values({
        entityType: 'test_entity',
        entityId: 'test-id-123',
        action: 'create' as any,
        ipAddress: '127.0.0.1',
      })
      .returning();

    testRecordId = inserted.id;
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should reject UPDATE on audit_ledger via database trigger', async () => {
    await expect(
      db
        .update(schema.auditLedger)
        .set({ action: 'update' as any })
        .where(eq(schema.auditLedger.id, testRecordId)),
    ).rejects.toThrow();
  });

  it('should reject DELETE on audit_ledger via database trigger', async () => {
    await expect(
      db
        .delete(schema.auditLedger)
        .where(eq(schema.auditLedger.id, testRecordId)),
    ).rejects.toThrow();
  });
});
