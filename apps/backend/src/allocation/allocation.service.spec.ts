import { AllocationBasisService } from './allocation-basis.service';
import { AllocationService } from './allocation.service';

describe('AllocationService (SRS FR-07 / AC-02)', () => {
  const service = new AllocationService(new AllocationBasisService(), {});
  const items = [
    {
      id: 'item-a',
      ciValueEtb: '50000',
      weightKg: '200',
      volumeCbm: '5',
      shippedQuantity: '500',
    },
    {
      id: 'item-b',
      ciValueEtb: '30000',
      weightKg: '150',
      volumeCbm: '15',
      shippedQuantity: '200',
    },
  ];

  it.each([
    ['by_value', ['5000.0000', '3000.0000']],
    ['by_weight', ['4571.4286', '3428.5714']],
    ['by_volume', ['2000.0000', '6000.0000']],
    ['by_quantity', ['5714.2857', '2285.7143']],
  ] as const)(
    'allocates an ETB 8,000 component by %s and reconciles exactly',
    (method, expected) => {
      const results = service.allocateCost('8000', items, method);

      expect(results.map((result) => result.allocatedAmount)).toEqual(expected);
      expect(
        results.reduce(
          (sum, result) => sum + Number(result.allocatedAmount),
          0,
        ),
      ).toBe(8000);
    },
  );

  it('assigns a four-decimal rounding residual to the highest-CI-value item', () => {
    const results = service.allocateCost(
      '0.0001',
      [
        { id: 'low', ciValueEtb: '10', shippedQuantity: '1' },
        { id: 'high', ciValueEtb: '20', shippedQuantity: '1' },
        { id: 'middle', ciValueEtb: '15', shippedQuantity: '1' },
      ],
      'by_quantity',
    );

    expect(results.map((result) => result.allocatedAmount)).toEqual([
      '0.0000',
      '0.0001',
      '0.0000',
    ]);
    expect(results[1].isResidualHolder).toBe(true);
  });
});
