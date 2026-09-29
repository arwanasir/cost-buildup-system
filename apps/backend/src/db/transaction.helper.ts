import { Inject, Injectable } from '@nestjs/common';
import { ExtractTablesWithRelations } from 'drizzle-orm';
import { PgTransaction } from 'drizzle-orm/pg-core';
import { NodePgQueryResultHKT } from 'drizzle-orm/node-postgres';
import { DRIZZLE, DrizzleDB } from './db.module';
import * as schema from './schema/schema';

export type TransactionClient = PgTransaction<
  NodePgQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

@Injectable()
export class TransactionHelper {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async withTransaction<T>(
    callback: (tx: TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.db.transaction(async (tx) => {
      return await callback(tx);
    });
  }
}
