import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { SettingsPage } from './SettingsPage';
import { api } from '@/lib/api-client';

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const mockSettings = [
    {
      id: '1',
      key: 'po_approval_threshold_1',
      valueNumeric: '10000.0000',
      valueText: null,
      description: 'Threshold 1',
    },
    {
      id: '2',
      key: 'po_number_prefix',
      valueNumeric: null,
      valueText: 'PO-',
      description: 'PO Prefix',
    },
  ];

  it('renders settings and opens edit modal', async () => {
    (api.get as any).mockResolvedValueOnce({ data: { data: mockSettings } });

    renderWithProviders(<SettingsPage />);

    // Wait for the settings to load
    expect(
      await screen.findByText('PO Approval Tier 1 Threshold'),
    ).toBeInTheDocument();
    expect(screen.getByText('10000.0000')).toBeInTheDocument();
    expect(screen.getByText('Purchase Order Prefix')).toBeInTheDocument();
    expect(screen.getByText('PO-')).toBeInTheDocument();

    // Click Edit on the first setting
    const editButtons = screen.getAllByText('Edit Value');
    fireEvent.click(editButtons[0]); // Numeric setting

    // Verify modal is open with correct input
    expect(
      await screen.findByText('Update PO Approval Tier 1 Threshold'),
    ).toBeInTheDocument();

    // Impact message should be visible
    expect(
      screen.getByText(/Modifying this changes the financial boundary/i),
    ).toBeInTheDocument();

    const input = screen.getByDisplayValue('10000.0000') as HTMLInputElement;
    expect(input.type).toBe('number');

    // Change value
    fireEvent.change(input, { target: { value: '25000' } });

    (api.patch as any).mockResolvedValueOnce({ data: {} });
    (api.get as any).mockResolvedValueOnce({ data: { data: mockSettings } }); // for refetch

    // Save
    fireEvent.click(screen.getByText('Apply Setting'));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/settings/po_approval_threshold_1',
        {
          valueNumeric: 25000,
        },
      );
    });
  });

  it('handles text prefix updates correctly', async () => {
    (api.get as any).mockResolvedValueOnce({ data: { data: mockSettings } });

    renderWithProviders(<SettingsPage />);

    expect(
      await screen.findByText('Purchase Order Prefix'),
    ).toBeInTheDocument();

    const editButtons = screen.getAllByText('Edit Value');
    fireEvent.click(editButtons[1]); // Text setting

    expect(
      await screen.findByText('Update Purchase Order Prefix'),
    ).toBeInTheDocument();

    const input = screen.getByDisplayValue('PO-') as HTMLInputElement;
    expect(input.type).toBe('text');

    fireEvent.change(input, { target: { value: 'NEWPO-' } });

    (api.patch as any).mockResolvedValueOnce({ data: {} });
    (api.get as any).mockResolvedValueOnce({ data: { data: mockSettings } });

    fireEvent.click(screen.getByText('Apply Setting'));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/settings/po_number_prefix', {
        valueText: 'NEWPO-',
      });
    });
  });
});
