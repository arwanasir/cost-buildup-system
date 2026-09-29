import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { DRIZZLE, DrizzleDB } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export type NumberingType = 'po' | 'shipment' | 'lc' | 'grn';

@Injectable()
export class NumberingService implements OnModuleInit {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async onModuleInit() {
    // Ensure all sequences exist for document numbering
    await this.db.execute(
      sql`CREATE SEQUENCE IF NOT EXISTS po_number_seq START 1;`,
    );
    await this.db.execute(
      sql`CREATE SEQUENCE IF NOT EXISTS shp_number_seq START 1;`,
    );
    await this.db.execute(
      sql`CREATE SEQUENCE IF NOT EXISTS lc_number_seq START 1;`,
    );
    await this.db.execute(
      sql`CREATE SEQUENCE IF NOT EXISTS grn_number_seq START 1;`,
    );
  }

  async generateNextNumber(type: NumberingType): Promise<string> {
    let seqName = '';
    let prefixKey = '';
    let defaultPrefix = '';

    switch (type) {
      case 'po':
        seqName = 'po_number_seq';
        prefixKey = 'po_number_prefix';
        defaultPrefix = 'PO-';
        break;
      case 'shipment':
        seqName = 'shp_number_seq';
        prefixKey = 'shipment_number_prefix';
        defaultPrefix = 'SHP-';
        break;
      case 'lc':
        seqName = 'lc_number_seq';
        prefixKey = 'lc_number_prefix';
        defaultPrefix = 'LC-';
        break;
      case 'grn':
        seqName = 'grn_number_seq';
        prefixKey = 'grn_number_prefix';
        defaultPrefix = 'GRN-';
        break;
    }

    // 1. Fetch next sequence value securely using sql.raw
    const res = await this.db.execute(sql.raw(`SELECT nextval('${seqName}')`));
    const nextVal = (res as any).rows[0].nextval as string;

    // 2. Get prefix configuration from policy_settings
    const setting = await this.db.query.policySettings.findFirst({
      where: eq(schema.policySettings.key, prefixKey),
    });

    const prefix = setting?.valueText || defaultPrefix;

    // 3. Format Number (e.g. PO-00001)
    const padded = nextVal.padStart(5, '0');
    return `${prefix}${padded}`;
  }
}
