import {
  Injectable,
  BadRequestException,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { DRIZZLE, DrizzleDB } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { UpdateShipmentStatusDto } from './dto/update-shipment-status.dto';

@Injectable()
export class ShipmentStatusService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // Strictly enforced state machine transitions
  private readonly allowedTransitions: Record<string, string[]> = {
    ordered: ['shipped'],
    shipped: ['at_customs'],
    at_customs: ['cleared'],
    cleared: ['partially_received', 'received'],
    partially_received: ['received'],
    received: [],
  };

  async updateStatus(
    shipmentId: string,
    dto: UpdateShipmentStatusDto,
    userId: string,
  ) {
    return this.db.transaction(async (tx) => {
      const shipment = await tx.query.importShipments.findFirst({
        where: eq(schema.importShipments.id, shipmentId),
      });

      if (!shipment) {
        throw new NotFoundException(`Shipment ${shipmentId} not found`);
      }

      const currentStatus = shipment.status as string;
      const newStatus = dto.status;

      // 1. Verify Transition
      const validNextStates = this.allowedTransitions[currentStatus] || [];
      if (!validNextStates.includes(newStatus)) {
        throw new BadRequestException(
          `Cannot transition shipment from '${currentStatus}' to '${newStatus}'`,
        );
      }

      // 2. Conditional Validation: 'at_customs' requires actualArrivalDate
      const updateData: any = { status: newStatus as any, updatedBy: userId };

      if (newStatus === 'at_customs') {
        const actualArrivalDate =
          dto.actualArrivalDate || shipment.actualArrivalDate;
        if (!actualArrivalDate) {
          throw new BadRequestException(
            `actual_arrival_date is required when transitioning to 'at_customs'`,
          );
        }
        if (dto.actualArrivalDate) {
          updateData.actualArrivalDate = dto.actualArrivalDate;
        }
      }

      // 3. Commit Update
      const [updatedShipment] = await tx
        .update(schema.importShipments)
        .set(updateData)
        .where(eq(schema.importShipments.id, shipmentId))
        .returning();

      return updatedShipment;
    });
  }
}
