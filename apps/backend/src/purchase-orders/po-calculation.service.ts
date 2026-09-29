import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';

export interface PoCalculationLine {
  quantity: number | string;
  unitPrice: number | string;
  estimatedDutyRate: number | string;
}

export interface PoCalculationParams {
  fxRate: number | string;
  estimatedFreightEtb?: number | string;
  estimatedInsuranceEtb?: number | string;
  estimatedOtherChargesEtb?: number | string;
  lines: PoCalculationLine[];
}

@Injectable()
export class PoCalculationService {
  calculateTotals(params: PoCalculationParams) {
    const fxRate = new Decimal(params.fxRate);
    const freight = new Decimal(params.estimatedFreightEtb || 0);
    const insurance = new Decimal(params.estimatedInsuranceEtb || 0);
    const otherCharges = new Decimal(params.estimatedOtherChargesEtb || 0);

    // 1. Line foreign values
    const parsedLines = params.lines.map((line) => {
      const qty = new Decimal(line.quantity);
      const price = new Decimal(line.unitPrice);
      const dutyRate = new Decimal(line.estimatedDutyRate || 0);

      const totalLineValue = qty.times(price).toDecimalPlaces(4);

      return {
        ...line,
        totalLineValue,
        dutyRate,
      };
    });

    // 2. Total Foreign Value
    const totalValueForeign = parsedLines
      .reduce((sum, line) => sum.plus(line.totalLineValue), new Decimal(0))
      .toDecimalPlaces(4);

    // 3. Total ETB Value
    const totalValueEtb = totalValueForeign.times(fxRate).toDecimalPlaces(4);

    // 4. Estimated CIF (ETB) = total_etb + estimated_freight + estimated_insurance
    const estimatedCIF = totalValueEtb
      .plus(freight)
      .plus(insurance)
      .toDecimalPlaces(4);

    // 5. Estimated Duty ETB = sum( (line.totalLineValue / totalValueForeign) * estimatedCIF * line.dutyRate )
    let estimatedDutyEtb = new Decimal(0);

    const calculatedLines = parsedLines.map((line) => {
      const share = totalValueForeign.isZero()
        ? new Decimal(0)
        : line.totalLineValue.dividedBy(totalValueForeign);

      const lineCifShare = share.times(estimatedCIF);
      const lineDutyEtb = lineCifShare.times(line.dutyRate).toDecimalPlaces(4);

      estimatedDutyEtb = estimatedDutyEtb.plus(lineDutyEtb);

      return {
        totalLineValue: line.totalLineValue.toFixed(4),
        lineDutyEtb: lineDutyEtb.toFixed(4),
      };
    });

    return {
      totalValueForeign: totalValueForeign.toFixed(4),
      totalValueEtb: totalValueEtb.toFixed(4),
      estimatedDutyEtb: estimatedDutyEtb.toFixed(4),
      estimatedCIF: estimatedCIF.toFixed(4),
      lines: calculatedLines,
    };
  }
}
