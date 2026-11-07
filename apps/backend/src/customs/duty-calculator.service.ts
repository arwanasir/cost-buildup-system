import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { AllocationService } from './allocation.service';
import Decimal from 'decimal.js';
import { DRIZZLE } from '@/db/db.token';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class DutyCalculatorService {
  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    private readonly allocationService: AllocationService,
  ) {}

  async computeItemCif(shipmentItemId: string): Promise<string> {
    // 1. Fetch item and its shipment to check Incoterm
    const itemWithShipment = await this.db.query.shipmentItems.findFirst({
      where: eq(schema.shipmentItems.id, shipmentItemId),
      with: {
        shipment: true,
      },
    });

    if (!itemWithShipment) {
      throw new NotFoundException(`Shipment item ${shipmentItemId} not found`);
    }

    let cif = new Decimal(itemWithShipment.ciValueEtb || 0);

    // 2. If incoterm is 'CIF', the CI value already includes Freight and Insurance.
    // We assume uppercase comparison for safety.
    const incoterm = itemWithShipment.shipment?.incoterm?.toUpperCase() || '';
    if (incoterm === 'CIF') {
      return cif.toString();
    }

    // 3. Otherwise, fetch allocated freight and insurance for this item
    const allocatedFreightAndInsurance =
      await this.allocationService.getAllocatedAmountEtb(shipmentItemId, [
        'FREIGHT',
        'INSURANCE',
      ]);

    // 4. Add to base CI value
    cif = cif.plus(allocatedFreightAndInsurance);

    return cif.toString();
  }

  /**
   * Computes all customs duties for a single line item.
   *
   * Ethiopian customs tax cascade (SRS FR-05.1):
   *  1. Duty    = CIF × dutyRate%  (or qty × specificDutyPerUnit for specific duty)
   *  2. Excise  = (CIF + Duty) × exciseRate%
   *  3. VAT     = (CIF + Duty) × vatRate%      ← Excise is NOT part of the VAT base
   *  4. WHT     = CIF × withholdingRate%
   *
   * Note: Although excise is calculated on (CIF + Duty), it is NOT added to
   * the VAT base. This matches the SRS FR-05.1 formula and Ethiopian Revenue
   * and Customs Authority (ERCA) practice.
   */
  computeItemDuties(
    itemCifEtb: string,
    quantity: string,
    dutyStructure: 'ad_valorem' | 'specific',
    dutyRate: string,
    specificDutyPerUnit: string,
    exciseRate: string,
    vatRate: string,
    withholdingRate: string,
  ) {
    const cif = new Decimal(itemCifEtb || 0);
    const qty = new Decimal(quantity || 0);
    const dRate = new Decimal(dutyRate || 0);
    const specificDuty = new Decimal(specificDutyPerUnit || 0);
    const eRate = new Decimal(exciseRate || 0);
    const vRate = new Decimal(vatRate || 0);
    const wRate = new Decimal(withholdingRate || 0);

    // Step 1: Duty
    let dutyEtb = new Decimal(0);
    if (dutyStructure === 'specific') {
      dutyEtb = qty.times(specificDuty);
    } else {
      dutyEtb = cif.times(dRate).dividedBy(100);
    }

    // Step 2: Excise = (CIF + Duty) × exciseRate%
    const exciseEtb = cif.plus(dutyEtb).times(eRate).dividedBy(100);

    // Step 3: FIX — VAT = (CIF + Duty) × vatRate%
    // The old (incorrect) code was: vatEtb = (CIF + Duty + Excise) × vatRate%
    // The correct SRS FR-05.1 formula does NOT include excise in the VAT base.
    const vatEtb = cif.plus(dutyEtb).times(vRate).dividedBy(100);

    // Step 4: Withholding = CIF × withholdingRate%
    const withholdingEtb = cif.times(wRate).dividedBy(100);

    return {
      dutyEtb: dutyEtb.toFixed(4),
      exciseEtb: exciseEtb.toFixed(4),
      vatEtb: vatEtb.toFixed(4),
      withholdingEtb: withholdingEtb.toFixed(4),
    };
  }
}
