import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import { AuditService } from './audit.service';
import { AUDITED_ENTITY_KEY } from './audited.decorator';
import { DRIZZLE } from '@/db/db.token';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private auditService: AuditService,
    @Inject(DRIZZLE) private readonly db: any,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const entityType =
      this.reflector.get<string>(AUDITED_ENTITY_KEY, context.getHandler()) ||
      this.reflector.get<string>(AUDITED_ENTITY_KEY, context.getClass());

    if (!entityType) {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest();
    if (
      req.method === 'GET' ||
      req.method === 'OPTIONS' ||
      req.method === 'HEAD'
    )
      return next.handle();
    const entityId =
      req.params.id ||
      req.params.shipmentId ||
      req.params.varianceId ||
      req.params.ciId ||
      req.params.declarationId ||
      req.params.hsCode ||
      null;

    let beforeValue = null;

    // Snapshot before state if an entity ID is present in the route and the table exists
    if (entityId) {
      const table = (schema as any)[entityType];
      if (table && table.id) {
        try {
          const results = await this.db
            .select()
            .from(table)
            .where(eq(table.id, entityId));
          if (results && results.length > 0) {
            beforeValue = results[0];
          }
        } catch (e) {
          console.warn(
            `[AuditInterceptor] Failed to fetch before state for ${entityType} ${entityId}`,
          );
        }
      }
    }

    return next.handle().pipe(
      concatMap(async (responseValue) => {
        try {
          const responseEntity =
            responseValue?.data ?? responseValue?.result ?? responseValue;
          const afterValue = Array.isArray(responseEntity)
            ? responseEntity[0]
            : responseEntity;

          const resolvedEntityId =
            entityId || afterValue?.id || responseValue?.id;
          if (!resolvedEntityId) {
            return responseValue;
          }

          const action = this.determineAction(req);
          const actorId = req.user?.id || req.user?.sub;

          await this.auditService.record({
            entityType,
            entityId: resolvedEntityId,
            action,
            actorId,
            ip: req.clientIp || req.ip,
            before: beforeValue,
            after: action === 'delete' ? null : afterValue,
            correlationId: req.correlationId,
          });
        } catch (err) {
          console.error('[AuditInterceptor] Failed to write audit log', err);
        }
        return responseValue;
      }),
    );
  }

  private determineAction(req: any): string {
    const method = req.method.toUpperCase();
    const path = req.path.toLowerCase();

    // Map custom transactional endpoints
    if (path.endsWith('/approve')) return 'approve';
    if (path.endsWith('/reject')) return 'reject';
    if (path.endsWith('/finalise')) return 'finalise';
    if (path.endsWith('/post')) return 'post';
    if (path.endsWith('/reverse')) return 'reverse';

    // Map standard REST
    if (method === 'POST') return 'create';
    if (method === 'PATCH' || method === 'PUT') return 'update';
    if (method === 'DELETE') return 'delete';

    return 'update'; // fallback
  }
}
