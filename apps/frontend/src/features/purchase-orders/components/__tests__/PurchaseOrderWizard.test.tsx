import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { PurchaseOrderWizard } from '../PurchaseOrderWizard';

describe('PurchaseOrderWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('navigates steps and calculates live line totals', async () => {
    renderWithProviders(
      <PurchaseOrderWizard isOpen={true} onClose={() => {}} />,
    );

    // Step 1: Basic Info
    expect(await screen.findByText('PO Header')).toBeInTheDocument();

    // Fill required step 1
    const incotermSelect = screen.getByLabelText(/Incoterm/i);
    fireEvent.change(incotermSelect, { target: { value: 'FOB' } });

    // Click Next
    const nextBtn = screen.getByRole('button', { name: /Next Step/i });
    fireEvent.click(nextBtn);

    // Step 2: Lines
    expect(await screen.findByText('Line Items')).toBeInTheDocument();

    // Check if line total is 0.00 initially
    const lineTotalElements = screen.getAllByText(/Line Total/i);
    const lineTotalParent = lineTotalElements[0].parentElement;
    expect(lineTotalParent).toHaveTextContent(/0\.00/);

    // Add a line item amount
    const qtyInputs = screen.getAllByLabelText(/Quantity/i);
    const priceInputs = screen.getAllByLabelText(/Unit Price/i);

    fireEvent.change(qtyInputs[0], { target: { value: '10' } });
    fireEvent.change(priceInputs[0], { target: { value: '50' } });

    // The line total should update live to 500
    await waitFor(() => {
      expect(lineTotalParent).toHaveTextContent(/500\.00/);
    });

    // Step navigation back
    const prevBtn = screen.getByRole('button', { name: /Previous/i });
    fireEvent.click(prevBtn);

    expect(await screen.findByText('PO Header')).toBeInTheDocument();
  });
});
