import { numeric, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Monetary values (e.g., total cost, extended total, budget limits).
 * Precision: 18, Scale: 4
 */

export const money = (name: string) =>
    numeric(name, { precision: 18, scale: 4 });


/**
 * Exchange rates, percentage rates, multipliers, and conversion factors.
 * Precision: 18, Scale: 6
 */

export const rate = (name: string) =>
    numeric(name, { precision: 18, scale: 6 });

/**
 * Unit costs, unit prices, and high-precision per-item metrics.
 * Precision: 18, Scale: 6
 */

export const unitCost = (name: string) =>
    numeric(name, { precision: 18, scale: 6 });

/**
 * Standard audit tracking columns for entities (SRS 5.3).
 * Tracks creator, timestamp, last modifier, and last modified timestamp.
 */

export const auditColumns = {
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { mode: 'string', withTimezone: true }).defaultNow().notNull(),
    updatedBy: uuid('updated_by'),
    updatedAt: timestamp('updated_at', { mode: 'string', withTimezone: true }).defaultNow()
        .notNull(),
};

