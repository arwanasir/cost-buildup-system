import { Test, TestingModule } from '@nestjs/testing';
import { PoCalculationService } from './po-calculation.service';
import Decimal from 'decimal.js';

describe('PoCalculationService', () => {
  let service: PoCalculationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PoCalculationService],
    }).compile();

    service = module.get<PoCalculationService>(PoCalculationService);
  });

  it('should restore proper test', () => {
    const result = service.calculateTotals({
      fxRate: 120.5,
      estimatedFreightEtb: 50000,
      estimatedInsuranceEtb: 15000,
      estimatedOtherChargesEtb: 0,
      lines: [
        { quantity: 10, unitPrice: 100.5, estimatedDutyRate: 0.3 },
        { quantity: 5, unitPrice: 200, estimatedDutyRate: 0.1 },
        { quantity: 2, unitPrice: 50, estimatedDutyRate: 0 },
      ],
    });

    expect(result.totalValueForeign).toEqual('2105.0000');
    expect(result.totalValueEtb).toEqual('253652.5000');
    expect(result.estimatedCIF).toEqual('318652.5000');
    expect(result.estimatedDutyEtb).toEqual('60778.6122');

    expect(result.lines).toHaveLength(3);

    // Line 1 checks
    expect(result.lines[0].totalLineValue).toEqual('1005.0000');
    expect(result.lines[0].lineDutyEtb).toEqual('45640.7262');

    // Line 2 checks
    expect(result.lines[1].totalLineValue).toEqual('1000.0000');
    expect(result.lines[1].lineDutyEtb).toEqual('15137.8860');

    // Line 3 checks
    expect(result.lines[2].totalLineValue).toEqual('100.0000');
    expect(result.lines[2].lineDutyEtb).toEqual('0.0000');
  });

  it('should safely handle zero-value POs without dividing by zero errors', () => {
    const result = service.calculateTotals({
      fxRate: 120.5,
      estimatedFreightEtb: 1000, // Fixed cost but no line value
      estimatedInsuranceEtb: 0,
      lines: [{ quantity: 0, unitPrice: 100.5, estimatedDutyRate: 0.3 }],
    });

    expect(result.totalValueForeign).toEqual('0.0000');
    expect(result.totalValueEtb).toEqual('0.0000');
    // CIF has 1000 freight
    expect(result.estimatedCIF).toEqual('1000.0000');
    // But since totalValueForeign is 0, the duty share should safely be 0
    expect(result.estimatedDutyEtb).toEqual('0.0000');
  });
});
