import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DRIZZLE, DrizzleDB } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import Decimal from 'decimal.js';

@Injectable()
export class PoStatusService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async transition(poId: string, targetStatus: string, userId: string) {
    return this.db.transaction(async (tx) => {
      const po = await tx.query.importPurchaseOrders.findFirst({
        where: eq(schema.importPurchaseOrders.id, poId),
        with: { poLines: true },
      });

      if (!po) throw new NotFoundException(`Purchase Order ${poId} not found`);

      let computedStatus = targetStatus;

      switch (targetStatus) {
        case 'lc_applied':
          if (po.status !== 'approved') {
            throw new BadRequestException(
              `Cannot transition to lc_applied from ${po.status}`,
            );
          }
          break;

        case 'shipped':
          if (po.status !== 'lc_applied' && po.status !== 'approved') {
            throw new BadRequestException(
              `Cannot transition to shipped from ${po.status}`,
            );
          }
          break;

        case 'partially_received':
        case 'fully_received':
          if (po.status !== 'shipped' && po.status !== 'partially_received') {
            throw new BadRequestException(
              `Cannot transition to received from ${po.status}`,
            );
          }

          let isFullyReceived = true;
          let hasReceivedAnything = false;

          for (const line of po.poLines as any[]) {
            const qty = new Decimal(line.quantity);
            const receivedQty = new Decimal(line.receivedQuantity || 0);

            if (receivedQty.gt(0)) hasReceivedAnything = true;
            if (receivedQty.lt(qty)) isFullyReceived = false;
          }

          if (!hasReceivedAnything) {
            throw new BadRequestException(
              'Cannot transition to received states: no quantities have been received yet on any line.',
            );
          }

          computedStatus = isFullyReceived
            ? 'fully_received'
            : 'partially_received';
          break;

        case 'closed':
          if (
            po.status !== 'fully_received' &&
            po.status !== 'partially_received' &&
            po.status !== 'shipped'
          ) {
            throw new BadRequestException(
              `Cannot close PO from status ${po.status}`,
            );
          }
          break;

        default:
          throw new BadRequestException(
            `Unknown target status: ${targetStatus}`,
          );
      }

      await tx
        .update(schema.importPurchaseOrders)
        .set({
          status: computedStatus as any,
          updatedBy: userId,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.importPurchaseOrders.id, poId));

      return {
        id: po.id,
        oldStatus: po.status,
        newStatus: computedStatus,
      };
    });
  }
}
