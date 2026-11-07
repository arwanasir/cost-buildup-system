import { BadRequestException, Injectable } from '@nestjs/common';
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

    if (method === 'by_weight') {
      const missingWeight = items.some((item) => {
        if (item.weightKg === null || item.weightKg === undefined || item.weightKg === '') {
          return true;
        }
        return !new Decimal(item.weightKg).greaterThan(0);
      });
      if (missingWeight) {
        throw new BadRequestException(
          "Cannot allocate by weight: every shipment item needs a positive weight. Add missing weights or explicitly select 'By Value' for this cost component.",
        );
      }
    }

    if (method === 'by_volume') {
      const missingVolume = items.some((item) => {
        if (item.volumeCbm === null || item.volumeCbm === undefined || item.volumeCbm === '') {
          return true;
        }
        return !new Decimal(item.volumeCbm).greaterThan(0);
      });
      if (missingVolume) {
        throw new BadRequestException(
          "Cannot allocate by volume: every shipment item needs a positive volume. Add missing volumes or explicitly select 'By Value' for this cost component.",
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

      // Protect against negative basis values
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
