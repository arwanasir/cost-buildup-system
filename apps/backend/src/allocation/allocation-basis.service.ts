import { Injectable, BadRequestException } from '@nestjs/common';
import Decimal from 'decimal.js';

export type AllocationMethod =
  | 'by_value'
  | 'by_weight'
  | 'by_volume'
  | 'by_quantity'
  | 'equal_split'
  | 'item_specific'
  | 'manual';

@Injectable()
export class AllocationBasisService {
  getBasisValues(
    items: any[],
    method: AllocationMethod,
  ): { itemId: string; basis: any }[] {
    if (!items || items.length === 0) return [];

    // BR12: Prevent by_weight or by_volume if measurements are missing
    if (method === 'by_weight') {
      const isMissingWeight = items.some(
        (i) => !i.weightKg || new Decimal(i.weightKg).isZero(),
      );
      if (isMissingWeight) {
        throw new BadRequestException(
          'BR12: One or more shipment items lack weight measurements. Cannot allocate by_weight. Please override the allocation method to by_value.',
        );
      }
    }

    if (method === 'by_volume') {
      const isMissingVolume = items.some(
        (i) => !i.volumeCbm || new Decimal(i.volumeCbm).isZero(),
      );
      if (isMissingVolume) {
        throw new BadRequestException(
          'BR12: One or more shipment items lack volume measurements. Cannot allocate by_volume. Please override the allocation method to by_value.',
        );
      }
    }

    return items.map((item) => {
      let basis = new Decimal(0);

      switch (method) {
        case 'by_value':
          basis = new Decimal(item.ciValueEtb || 0);
          break;
        case 'by_weight':
          basis = new Decimal(item.weightKg || 0);
          break;
        case 'by_volume':
          basis = new Decimal(item.volumeCbm || 0);
          break;
        case 'by_quantity':
          basis = new Decimal(item.shippedQuantity || 0);
          break;
        case 'equal_split':
          basis = new Decimal(1);
          break;
        default:
          basis = new Decimal(0);
          break;
      }

      // Protect against negative basis weights
      if (basis.isNegative()) {
        basis = new Decimal(0);
      }

      return {
        itemId: item.id, // maps to shipmentItemId in allocations
        basis,
      };
    });
  }

  getTotalBasis(basisValues: { itemId: string; basis: any }[]): any {
    return basisValues.reduce(
      (sum, current) => sum.plus(current.basis),
      new Decimal(0),
    );
  }
}
