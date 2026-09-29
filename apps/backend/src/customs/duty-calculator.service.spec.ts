import { Test, TestingModule } from '@nestjs/testing';
import { DutyCalculatorService } from './duty-calculator.service';
import { AllocationService } from './allocation.service';
import { DRIZZLE } from '@/db';

describe('DutyCalculatorService', () => {
  let service: DutyCalculatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DutyCalculatorService,
        {
          provide: AllocationService,
          useValue: {},
        },
        {
          provide: DRIZZLE,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<DutyCalculatorService>(DutyCalculatorService);
  });

  describe('computeItemDuties (TC-DUTY01)', () => {
    it('should correctly compute an ad valorem item', () => {
      // CIF = 10,000, Duty 10%, Excise 0%, VAT 15%, Withholding 3%
      const result = service.computeItemDuties(
        '10000.00',
        '100', // Qty
        'ad_valorem',
        '10.00', // Duty %
        '0.00',
        '0.00',
        '15.00', // VAT %
        '3.00', // Withholding %
      );

      // Duty = 10000 * 10% = 1000
      expect(result.dutyEtb).toBe('1000.0000');
      // Excise = 0
      expect(result.exciseEtb).toBe('0.0000');
      // VAT = (10000 + 1000) * 15% = 1650
      expect(result.vatEtb).toBe('1650.0000');
      // Withholding = 10000 * 3% = 300
      expect(result.withholdingEtb).toBe('300.0000');
    });

    it('should correctly compute a specific-duty item', () => {
      // CIF = 10,000, Qty = 100, Specific Duty = 50 per unit, Excise = 0%, VAT 15%, Withholding 3%
      const result = service.computeItemDuties(
        '10000.00',
        '100', // Qty
        'specific',
        '0.00',
        '50.00', // 50 per unit
        '0.00',
        '15.00', // VAT %
        '3.00', // Withholding %
      );

      // Duty = 100 * 50 = 5000
      expect(result.dutyEtb).toBe('5000.0000');
      // Excise = 0
      expect(result.exciseEtb).toBe('0.0000');
      // VAT = (10000 + 5000) * 15% = 2250
      expect(result.vatEtb).toBe('2250.0000');
      // Withholding = 10000 * 3% = 300
      expect(result.withholdingEtb).toBe('300.0000');
    });

    it('should correctly compute an excisable item', () => {
      // CIF = 10,000, Duty 10%, Excise 100%, VAT 15%, Withholding 3%
      // e.g. imported vehicles
      const result = service.computeItemDuties(
        '10000.00',
        '1', // Qty
        'ad_valorem',
        '10.00', // Duty %
        '0.00',
        '100.00', // Excise %
        '15.00', // VAT %
        '3.00', // Withholding %
      );

      // Duty = 10000 * 10% = 1000
      expect(result.dutyEtb).toBe('1000.0000');
      // Excise = (10000 + 1000) * 100% = 11000
      expect(result.exciseEtb).toBe('11000.0000');
      // VAT = (10000 + 1000 + 11000) * 15% = (22000) * 15% = 3300
      expect(result.vatEtb).toBe('3300.0000');
      // Withholding = 10000 * 3% = 300
      expect(result.withholdingEtb).toBe('300.0000');
    });

    it('should handle fractional specific quantities correctly to 4 dp', () => {
      // CIF = 5,432.10, Qty = 12.345, Specific = 8.5 per unit, VAT = 15%
      const result = service.computeItemDuties(
        '5432.10',
        '12.345',
        'specific',
        '0',
        '8.50',
        '0',
        '15.00',
        '3.00',
      );

      // Duty = 12.345 * 8.5 = 104.9325
      expect(result.dutyEtb).toBe('104.9325');

      // Excise = 0
      expect(result.exciseEtb).toBe('0.0000');

      // VAT = (5432.10 + 104.9325) * 15% = 5537.0325 * 0.15 = 830.554875
      // toFixed(4) -> '830.5549' (half up rounding by decimal.js depending on config, but decimal.js toFixed does standard JS rounding by default or Half_UP? 830.554875 -> 830.5549)
      // Actually, decimal.js defaults to ROUND_HALF_UP. 830.554875 rounds to 830.5549.
      expect(result.vatEtb).toBe('830.5549');

      // Withholding = 5432.10 * 3% = 162.963
      expect(result.withholdingEtb).toBe('162.9630');
    });
  });
});
