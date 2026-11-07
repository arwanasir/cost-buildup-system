import { of } from 'rxjs';
import { InventoryClient } from './inventory.client';

describe('InventoryClient', () => {
  it('uses the container ERP base URL over a stale localhost override', async () => {
    const httpService = {
      post: jest.fn().mockReturnValue(of({ data: { status: 'success' } })),
    };
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'ERP_BASE_URL') return 'http://erp-mock:3001';
        if (key === 'ERP_INVENTORY_URL') {
          return 'http://localhost:3001/inventory/postings';
        }
        return undefined;
      }),
    };
    const client = new InventoryClient(httpService as any, configService as any);

    await client.postReceipt([]);

    expect(httpService.post).toHaveBeenCalledWith(
      'http://erp-mock:3001/inventory/postings',
      { items: [] },
    );
  });
});
