import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LetterOfCreditForm } from '../LetterOfCreditForm';
import { BrowserRouter } from 'react-router-dom';

// Mock dependencies
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

vi.mock('@/features/suppliers/api', () => ({
  useSuppliers: vi.fn(() => ({
    data: { data: [{ id: 'sup-1', name: 'Global Tech' }] },
    isLoading: false,
  })),
}));

vi.mock('@/features/purchase-orders/api', () => ({
  usePurchaseOrders: vi.fn((params) => {
    if (params.supplierId === 'sup-1') {
      return {
        data: {
          data: [
            {
              id: 'po-1',
              poNumber: 'PO-001',
              totalAmount: '1000',
              currency: 'USD',
              lcId: null,
            },
            {
              id: 'po-2',
              poNumber: 'PO-002',
              totalAmount: '2000',
              currency: 'USD',
              lcId: null,
            },
            {
              id: 'po-3',
              poNumber: 'PO-003',
              totalAmount: '3000',
              currency: 'USD',
              lcId: 'existing-lc-123',
            },
          ],
        },
        isLoading: false,
      };
    }
    return { data: { data: [] }, isLoading: false };
  }),
}));

vi.mock('@/features/exchange-rates/api', () => ({
  useLatestExchangeRate: vi.fn(() => ({
    data: { rate: '120.5' },
  })),
}));

const mutateAsyncMock = vi.fn();
vi.mock('../../api', () => ({
  useCreateLetterOfCredit: vi.fn(() => ({
    mutateAsync: mutateAsyncMock,
    isPending: false,
  })),
}));

describe('LetterOfCreditForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderForm = () => {
    return render(
      <BrowserRouter>
        <LetterOfCreditForm />
      </BrowserRouter>,
    );
  };

  const selectSupplier = () => {
    const supplierInput = screen.getByLabelText(/Supplier/i);
    fireEvent.change(supplierInput, { target: { value: 'sup-1' } });
  };

  it('filters out POs that already have an LC attached (BR08)', async () => {
    renderForm();

    // Select supplier first to reveal POs
    selectSupplier();

    await waitFor(() => {
      // Should show PO-001 and PO-002
      expect(screen.getByText('PO-001')).toBeInTheDocument();
      expect(screen.getByText('PO-002')).toBeInTheDocument();

      // Should NOT show PO-003 because it has an lcId
      expect(screen.queryByText('PO-003')).not.toBeInTheDocument();
    });
  });

  it('validates date ordering: lastShipmentDate cannot be after expiryDate', async () => {
    renderForm();

    fireEvent.change(screen.getByLabelText(/LC Number/i), {
      target: { value: 'LC-001' },
    });
    fireEvent.change(screen.getByLabelText(/Issuing Bank/i), {
      target: { value: 'Commercial Bank of Ethiopia' },
    });
    selectSupplier();
    await waitFor(() => {
      expect(screen.getByText('PO-001')).toBeInTheDocument();
    });
    fireEvent.click(screen.getAllByRole('checkbox')[0]);

    // Fill out required dates in reverse order (invalid)
    const expiryInput = screen.getByLabelText(/Expiry Date/);
    const lastShipmentInput = screen.getByLabelText(/Latest Shipment Date/);

    fireEvent.change(expiryInput, { target: { value: '2026-10-15' } });
    fireEvent.change(lastShipmentInput, { target: { value: '2026-10-20' } });

    // Submit form
    const submitBtn = screen.getByRole('button', {
      name: /Create Letter of Credit/i,
    });
    fireEvent.click(submitBtn);

    // Should show validation error
    await waitFor(() => {
      expect(
        screen.getByText(/Last Shipment Date cannot be after Expiry Date/i),
      ).toBeInTheDocument();
    });

    // Fix the dates (valid)
    fireEvent.change(lastShipmentInput, { target: { value: '2026-10-10' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      // The specific error should disappear
      expect(
        screen.queryByText(/Last Shipment Date cannot be after Expiry Date/i),
      ).not.toBeInTheDocument();
    });
  });

  it('auto-calculates amountForeign based on selected POs', async () => {
    renderForm();

    selectSupplier();

    await waitFor(() => {
      expect(screen.getByText('PO-001')).toBeInTheDocument();
    });

    // Get the checkboxes (the actual input[type="checkbox"])
    const checkboxes = screen.getAllByRole('checkbox');
    // The first one is the PO-001 checkbox
    const po1Checkbox = checkboxes[0];
    const po2Checkbox = checkboxes[1];

    fireEvent.click(po1Checkbox);

    const amountInput = screen.getByLabelText(/Total LC Amount \(Foreign\)/i);
    await waitFor(() => {
      expect(amountInput).toHaveValue(1000); // 1000 from PO-001
    });

    fireEvent.click(po2Checkbox);
    await waitFor(() => {
      expect(amountInput).toHaveValue(3000); // 1000 + 2000
    });
  });
});
