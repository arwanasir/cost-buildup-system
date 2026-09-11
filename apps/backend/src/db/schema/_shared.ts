import { numeric, timestamp, uuid } from 'drizzle-orm/pg-core';


export const money = (name: string) =>
    numeric(name, { precision: 18, scale: 4 });


export const rate = (name: string) =>
    numeric(name, { precision: 18, scale: 6 });


export const unitCost = (name: string) =>
    numeric(name, { precision: 18, scale: 6 });

export const auditColumns = {
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { mode: 'string', withTimezone: true }).defaultNow().notNull(),
    updatedBy: uuid('updated_by'),
    updatedAt: timestamp('updated_at', { mode: 'string', withTimezone: true }).defaultNow()
        .notNull(),
};

