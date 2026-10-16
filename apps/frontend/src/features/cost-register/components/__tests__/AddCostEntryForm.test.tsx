import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { AddCostEntryForm } from '../AddCostEntryForm';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/server';

const API_URL = 'http://localhost:3000/api/v1';

describe('AddCostEntryForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays FX tolerance warning when rate diverges >5%', async () => {
    server.use(
      http.get(`${API_URL}/cost-categories`, () => {
        return HttpResponse.json({ data: [] });
      }),
      http.get(`${API_URL}/nbe-rates/latest`, () => {
        return HttpResponse.json({ rate: '100.00' });
      }),
    );

    const { container } = renderWithProviders(
      <AddCostEntryForm isOpen={true} onClose={() => {}} shipmentId="ship-1" />,
    );

    // Select USD to trigger NBE rate fetch
    const currencySelect = container.querySelector(
      'select[name="currency"]',
    ) as HTMLSelectElement;
    fireEvent.change(currencySelect, { target: { value: 'USD' } });

    // Wait for FX rate input to automatically populate to 100
    const fxRateInput = container.querySelector(
      'input[name="fxRate"]',
    ) as HTMLInputElement;
    await waitFor(() => {
      expect(fxRateInput.value).toBe('100');
    });

    // Warning should not be visible yet
    expect(
      screen.queryByText(
        /Warning: Rate differs by >5% from official NBE rate/i,
      ),
    ).not.toBeInTheDocument();

    // Change rate to 106 (>5% difference)
    fireEvent.change(fxRateInput, { target: { value: '106' } });

    expect(
      await screen.findByText(
        /Warning: Rate differs by >5% from official NBE rate/i,
      ),
    ).toBeInTheDocument();
  });
});
