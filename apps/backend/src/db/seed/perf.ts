import { drizzle } from 'drizzle-orm/node-postgres';
import * as dotenv from 'dotenv';
import { Pool } from 'pg';
import * as schema from '../schema/schema';
import { faker } from '@faker-js/faker';
import crypto from 'crypto';

dotenv.config({ path: '../.env' });

const connectionString =
  process.env.SEED_DATABASE_URL ||
  process.env.DRIZZLE_DATABASE_URL ||
  process.env.DATABASE_URL ||
  'postgres://cost_buildup_user:password@localhost:5432/cost_buildup_db';

const pool = new Pool({ connectionString });
const db = drizzle(pool, { schema });

export async function seedPerfData() {
  console.log('   -> Seeding Performance Data (10,000 POs and Shipments)...');

  const allUsers = await db.select().from(schema.users);
  const systemUserId = allUsers[0]?.id;

  const allCategories = await db.select().from(schema.costCategories);

  // 1. Create a perf supplier
  const supplierId = crypto.randomUUID();
  await db.insert(schema.suppliers).values([
    {
      id: supplierId,
      supplierCode: 'SUP-PERF',
      name: 'Perf Global Suppliers Ltd',
      country: 'CN',
    },
  ]);

  // 2. Create a perf item
  const itemId = crypto.randomUUID();
  await db.insert(schema.items).values([
    {
      id: itemId,
      itemCode: 'ITM-PERF',
      name: 'Perf Item',
      description: 'A perf item for reporting',
      defaultHsCode: '8517.12.00',
      unitOfMeasure: 'PCS',
      isActive: true,
    },
  ]);

  const BATCH_SIZE = 1000;
  const TOTAL = 10000;

  console.log(`   -> Generating ${TOTAL} POs in batches of ${BATCH_SIZE}...`);

  for (let i = 0; i < TOTAL; i += BATCH_SIZE) {
    const pos = [];
    const poLines = [];
    const shipments = [];

    for (let j = 0; j < BATCH_SIZE; j++) {
      const poId = crypto.randomUUID();
      const poNumber = `PO-PERF-${i + j + 1}`;
      const dateStr = faker.date
        .recent({ days: 365 })
        .toISOString()
        .split('T')[0];
      const amount = faker.finance.amount({ min: 1000, max: 50000, dec: 2 });

      pos.push({
        id: poId,
        poNumber,
        supplierId,
        poDate: dateStr,
        status: 'approved' as const,
        incoterm: faker.helpers.arrayElement([
          'FOB',
          'CIF',
          'EXW',
          'DAP',
        ]) as any,
        currency: 'USD',
        fxRate: '1',
        totalValueForeign: amount,
        totalValueEtb: amount,
      });

      poLines.push({
        id: crypto.randomUUID(),
        poId,
        lineNo: 1,
        itemId,
        quantity: '100',
        unitPrice: (parseFloat(amount) / 100).toFixed(2),
        totalLineValue: amount,
        unitOfMeasure: 'PCS',
      });

      const shipmentId = crypto.randomUUID();
      shipments.push({
        id: shipmentId,
        shipmentNumber: `SHP-PERF-${i + j + 1}`,
        poId,
        supplierId,
        status: faker.helpers.arrayElement([
          'ordered',
          'shipped',
          'at_customs',
          'cleared',
          'received',
        ]) as any,
        portOfLoading: faker.location.city(),
        portOfDestination: 'Djibouti',
        eta: dateStr,
      });
    }

    await db.insert(schema.importPurchaseOrders).values(pos);
    await db.insert(schema.poLines).values(poLines);
    await db.insert(schema.importShipments).values(shipments);

    console.log(`      Generated ${i + BATCH_SIZE} / ${TOTAL}`);
  }
}
