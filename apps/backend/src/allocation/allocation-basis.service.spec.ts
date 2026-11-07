import { BadRequestException } from '@nestjs/common';
import { AllocationBasisService } from './allocation-basis.service';

describe('AllocationBasisService (SRS BR12)', () => {
  const service = new AllocationBasisService();

  it.each([
    ['by_weight', 'weightKg'],
    ['by_volume', 'volumeCbm'],
  ] as const)(
    'rejects %s when any shipment item is missing %s instead of silently switching to value allocation',
    (method, field) => {
      expect(() =>
        service.getBasisValues(
          [
            { id: 'item-1', ciValueEtb: '100', [field]: '2' },
            { id: 'item-2', ciValueEtb: '300', [field]: null },
          ],
          method,
        ),
      ).toThrow(BadRequestException);
    },
  );

  it('accepts explicit by-value allocation when physical measurements are unavailable', () => {
    const values = service.getBasisValues(
      [
        { id: 'item-1', ciValueEtb: '100', weightKg: null },
        { id: 'item-2', ciValueEtb: '300', weightKg: null },
      ],
      'by_value',
    );

    expect(values.map(({ basis }) => basis.toString())).toEqual(['100', '300']);
  });
});
