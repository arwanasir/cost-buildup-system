import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

export default defineConfig({
    schema: './src/db/schema/index.ts',
    out: './drizzle',
    dialect: 'postgresql',
    dbCredentials: {
        url: 'postgresql://cost_buildup_user:password@localhost:5432/cost_buildup_db',
    },


    strict: true,

    verbose: true,

});
