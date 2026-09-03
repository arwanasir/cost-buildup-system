import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
dotenv.config();

export default defineConfig({
    schema: './src/db/schema/schema.ts',
    out: './drizzle',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DATABASE_URL || 'postgresql://cost_buildup_user:password@localhost:5432/cost_buildup_db',
    },


    strict: true,

    verbose: true,

});
