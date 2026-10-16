import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { GoodsReceiptFormPage } from '../GoodsReceiptFormPage';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/server';
import userEvent from '@testing-library/user-event';

const API_URL = 'http://localhost:3000/api/v1';

describe('GoodsReceiptFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates that accepted and rejected quantities sum to received quantity for partial inspections', async () => {
    const user = userEvent.setup();

    server.use(
      http.get(`${API_URL}/import-shipments`, () => {
        return HttpResponse.json([
          {
            id: 'ship-1',
            shipmentNumber: 'SHP-001',
            status: 'cleared',
            poId: 'po-1',
            items: [
              {
                id: 'item-1',
                poLineId: 'line-1',
                itemId: 'sku-1',
                shippedQuantity: 100,
                unitOfMeasure: 'pcs',
                unitPriceFcx: 10,
              },
            ],
          },
        ]);
      }),
      http.get(`${API_URL}/import-shipments/ship-1`, () => {
        return HttpResponse.json({
          id: 'ship-1',
          shipmentNumber: 'SHP-001',
          status: 'cleared',
          poId: 'po-1',
          items: [
            {
              id: 'item-1',
              poLineId: 'line-1',
              itemId: 'sku-1',
              shippedQuantity: 100,
              unitOfMeasure: 'pcs',
              unitPriceFcx: 10,
            },
          ],
        });
      }),
      http.get(`${API_URL}/purchase-orders/:poId`, () => {
        return HttpResponse.json({
          id: 'po-1',
          poNumber: 'PO-001',
          lines: [{ id: 'line-1', quantity: '100' }],
        });
      }),
    );

    renderWithProviders(<GoodsReceiptFormPage />);

    // Select the shipment
    const select = await screen.findByLabelText(/Select Shipment/i);
    await user.selectOptions(select, 'ship-1');

    // Wait for the item to render
    expect(await screen.findByText(/sku-1/i)).toBeInTheDocument();

    // The inspection result should be "Accepted" by default, so there's no error.
    expect(
      screen.queryByText(/Accepted \+ Rejected must equal Received Quantity/i),
    ).not.toBeInTheDocument();

    // Find the inspection result dropdown
    // It's the select element that has the "partial" option. We can find it by looking for the closest select element to the header.
    const selects = screen.getAllByRole('combobox');
    const inspectionSelect = selects[1]; // First is shipment, second is item's inspection

    await user.selectOptions(inspectionSelect, 'partial');

    // The default accepted and rejected might be 100 and 0 respectively for 'partial', so sum is 100 (which is valid).
    // Let's change accepted to 90
    const acceptedInput = screen.getByLabelText(/Accepted Quantity/i);
    const rejectedInput = screen.getByLabelText(/Rejected Quantity/i);

    // clear and type 90
    await user.clear(acceptedInput);
    await user.type(acceptedInput, '90');
    // rejected is still 0. Sum is 90. 90 != 100. Should show error.

    expect(
      await screen.findByText(
        /Accepted \+ Rejected must equal Received Quantity \(100\)/i,
      ),
    ).toBeInTheDocument();

    // clear rejected and type 10. 90 + 10 = 100.
    await user.clear(rejectedInput);
    await user.type(rejectedInput, '10');

    await waitFor(() => {
      expect(
        screen.queryByText(
          /Accepted \+ Rejected must equal Received Quantity \(100\)/i,
        ),
      ).not.toBeInTheDocument();
    });
  });
});
