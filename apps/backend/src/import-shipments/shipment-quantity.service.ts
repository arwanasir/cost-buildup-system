import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';

@Injectable()
export class ShipmentQuantityService {
  /**
   * Compares the shipped quantity against the outstanding PO quantity.
   * Returns a flag 'over_shipment', 'shortfall', or 'exact' based on FR-04.3.
   */
  compare(
    poLine: {
      quantity: string | number;
      shippedQuantity?: string | null | number;
    },
    shippedQuantity: number | string,
  ): 'over_shipment' | 'shortfall' | 'exact' {
    const totalOrdered = new Decimal(poLine.quantity);
    const previouslyShipped = new Decimal(poLine.shippedQuantity || 0);
    const currentlyShipping = new Decimal(shippedQuantity);

    const totalAfterShipment = previouslyShipped.plus(currentlyShipping);

    if (totalAfterShipment.greaterThan(totalOrdered)) {
      return 'over_shipment';
    } else if (totalAfterShipment.lessThan(totalOrdered)) {
      return 'shortfall';
    } else {
      return 'exact';
    }
  }
}
