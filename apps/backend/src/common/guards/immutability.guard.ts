import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { DRIZZLE } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class ImmutabilityGuard implements CanActivate {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const method = req.method.toUpperCase();

    if (['GET', 'OPTIONS', 'HEAD'].includes(method)) {
      return true;
    }

    if (req.path.toLowerCase().endsWith('/reverse')) {
      return true;
    }

    let shipmentId = req.body?.shipmentId || req.params?.shipmentId;

    if (!shipmentId && req.params.id) {
      if (req.path.includes('/cost-entries')) {
        const entry = await this.db
          .select({ shipmentId: schema.importCostEntries.shipmentId })
          .from(schema.importCostEntries)
          .where(eq(schema.importCostEntries.id, req.params.id))
          .limit(1);
        if (entry.length > 0) {
          shipmentId = entry[0].shipmentId;
        }
      } else if (req.path.includes('/shipments')) {
        shipmentId = req.params.id;
      }
    }

    if (shipmentId) {
      const shipment = await this.db
        .select({ isFinalised: schema.importShipments.isFinalised })
        .from(schema.importShipments)
        .where(eq(schema.importShipments.id, shipmentId))
        .limit(1);

      if (shipment.length > 0 && shipment[0].isFinalised) {
        throw new ConflictException('record is finalised; use reversal');
      }
    }

    return true;
  }
}
