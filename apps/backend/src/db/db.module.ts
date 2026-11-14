import {
  Global,
  Inject,
  Module,
  OnApplicationShutdown,
  Provider,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as tables from './schema/schema';
import * as relations from './schema/relations';
import { DRIZZLE } from './db.token';

const schema = { ...tables, ...relations };
const DATABASE_POOL = Symbol('DATABASE_POOL');

const poolProvider: Provider = {
  provide: DATABASE_POOL,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const connectionString =
      configService.get<string>('DATABASE_URL') ||
      'postgres://postgres:postgres123@localhost:5432/cost_buildup_db';
    const production = configService.get<string>('NODE_ENV') === 'production';
    return new Pool({
      connectionString,
      ...(production
        ? {
            ssl: {
              rejectUnauthorized: true,
              minVersion: 'TLSv1.3' as const,
            },
          }
        : {}),
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  },
};

const drizzleProvider: Provider = {
  provide: DRIZZLE,
  inject: [DATABASE_POOL],
  useFactory: (pool: Pool) => drizzle(pool, { schema }),
};

@Global()
@Module({
  providers: [poolProvider, drizzleProvider],
  exports: [DRIZZLE],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown() {
    await this.pool.end();
  }
}
