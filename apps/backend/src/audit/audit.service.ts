import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '@/db';
import * as schema from '@/db/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';

export interface AuditRecordDto {
  entityType: string;
  entityId: string;
  action:
    | 'create'
    | 'update'
    | 'delete'
    | 'approve'
    | 'reject'
    | 'finalise'
    | 'post'
    | 'reverse'
    | 'login'
    | string;
  actorId?: string;
  ip?: string;
  before?: any;
  after?: any;
  correlationId?: string;
}

@Injectable()
export class AuditService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async record(dto: AuditRecordDto) {
    const [inserted] = await this.db
      .insert(schema.auditLedger)
      .values({
        entityType: dto.entityType,
        entityId: dto.entityId,
        action: dto.action as any,
        actorId: dto.actorId || null,
        ipAddress: dto.ip || null,
        beforeValue: dto.before || null,
        afterValue: dto.after || null,
        correlationId: dto.correlationId || null,
        occurredAt: new Date().toISOString(),
      })
      .returning();

    return inserted;
  }
  async findAll(filters: {
    entity_type?: string;
    entity_id?: string;
    actor_id?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;

    const conditions = [];
    if (filters.entity_type)
      conditions.push(eq(schema.auditLedger.entityType, filters.entity_type));
    if (filters.entity_id)
      conditions.push(eq(schema.auditLedger.entityId, filters.entity_id));
    if (filters.actor_id)
      conditions.push(eq(schema.auditLedger.actorId, filters.actor_id));
    if (filters.from)
      conditions.push(gte(schema.auditLedger.occurredAt, filters.from));
    if (filters.to)
      conditions.push(lte(schema.auditLedger.occurredAt, filters.to));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const countQuery = await this.db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(schema.auditLedger)
      .where(whereClause);

    const total = countQuery[0]?.count || 0;

    const data = await this.db
      .select({
        id: schema.auditLedger.id,
        entityType: schema.auditLedger.entityType,
        entityId: schema.auditLedger.entityId,
        action: schema.auditLedger.action,
        actorId: schema.auditLedger.actorId,
        actorName: schema.users.fullName,
        ipAddress: schema.auditLedger.ipAddress,
        beforeValue: schema.auditLedger.beforeValue,
        afterValue: schema.auditLedger.afterValue,
        correlationId: schema.auditLedger.correlationId,
        occurredAt: schema.auditLedger.occurredAt,
      })
      .from(schema.auditLedger)
      .leftJoin(schema.users, eq(schema.auditLedger.actorId, schema.users.id))
      .where(whereClause)
      .orderBy(desc(schema.auditLedger.occurredAt))
      .limit(limit)
      .offset((page - 1) * limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
