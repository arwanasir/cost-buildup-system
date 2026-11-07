import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { server } from '@/test/server';
import { AllocationDrawer } from '../AllocationDrawer';

describe('AllocationDrawer', () => {
  it('resolves the cost category name from its ID when the entry has no relation', async () => {
    server.use(
      http.get(
        'http://localhost:3000/api/v1/import-shipments/shipment-1/allocations',
        () =>
          HttpResponse.json([
            {
              id: 'allocation-1',
              costEntryId: 'entry-1',
              shipmentItemId: 'shipment-item-1',
              allocationMethod: 'by_value',
              allocatedEtb: '125.0000',
              isResidualHolder: false,
              itemDetail: {
                itemId: 'ITEM-1',
                ciValueEtb: '1000.0000',
                weightKg: null,
                volumeCbm: null,
                quantity: '2',
              },
            },
          ]),
      ),
      http.get(
        'http://localhost:3000/api/v1/import-shipments/shipment-1/cost-entries',
        () =>
          HttpResponse.json([
            { id: 'entry-1', costCategoryId: 'category-1' },
          ]),
      ),
      http.get('http://localhost:3000/api/v1/cost-categories', () =>
        HttpResponse.json([
          {
            id: 'category-1',
            code: 'FREIGHT',
            name: 'Freight',
            defaultAllocationMethod: 'by_value',
            isItemSpecific: false,
            isActive: true,
            sortOrder: 1,
          },
        ]),
      ),
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AllocationDrawer
          shipmentId="shipment-1"
          isOpen
          onClose={() => undefined}
        />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Freight')).toBeInTheDocument();
    expect(screen.queryByText('Unknown Cost')).not.toBeInTheDocument();
  });
});
