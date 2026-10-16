import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { AuditLogPage } from './AuditLogPage';
import { api } from '@/lib/api-client';

vi.mock('@/lib/api-client', () => ({
  api: {
    get: vi.fn(),
  },
}));

describe('AuditLogPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const mockLogs = [
    {
      id: 'log1',
      entityType: 'POLICY_SETTING',
      entityId: 'setting-id-123',
      action: 'update',
      actorId: 'admin-123',
      beforeValue: { valueNumeric: '1000' },
      afterValue: { valueNumeric: '2000' },
      occurredAt: '2026-10-04T12:00:00Z',
    },
    {
      id: 'log2',
      entityType: 'PURCHASE_ORDER',
      entityId: 'po-456',
      action: 'create',
      actorId: 'admin-123',
      beforeValue: null,
      afterValue: { status: 'draft' },
      occurredAt: '2026-10-04T13:00:00Z',
    },
  ];

  it('renders the table and opens the diff viewer', async () => {
    (api.get as any).mockResolvedValueOnce({
      data: { data: mockLogs, total: 2 },
    });

    renderWithProviders(<AuditLogPage />);

    // Wait for the table to populate
    expect(await screen.findByText('setting-id-123')).toBeInTheDocument();
    expect(screen.getByText('po-456')).toBeInTheDocument();

    // Check Badges
    expect(screen.getByText('UPDATE')).toBeInTheDocument();
    expect(screen.getByText('CREATE')).toBeInTheDocument();

    // Click View Diff on the first row
    const viewDiffButtons = screen.getAllByText('View Diff');
    fireEvent.click(viewDiffButtons[0]);

    // Modal opens
    expect(
      await screen.findByText('UPDATE - POLICY_SETTING'),
    ).toBeInTheDocument();

    // Check JSON diffs are rendered
    const beforeStr = JSON.stringify({ valueNumeric: '1000' }, null, 2);
    const afterStr = JSON.stringify({ valueNumeric: '2000' }, null, 2);

    expect(screen.getByText(/valueNumeric.*1000/s)).toBeInTheDocument();
    expect(screen.getByText(/valueNumeric.*2000/s)).toBeInTheDocument();

    // Close modal
    fireEvent.click(screen.getByText('Close Viewer'));
    await waitFor(() => {
      expect(
        screen.queryByText('UPDATE - POLICY_SETTING'),
      ).not.toBeInTheDocument();
    });
  });

  it('applies filters to the API call', async () => {
    (api.get as any).mockResolvedValue({ data: { data: [], total: 0 } });

    renderWithProviders(<AuditLogPage />);

    // Initial load call
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining('/audit?limit=50'),
      );
    });

    // Fill filter
    const entityInputs = screen.getAllByPlaceholderText('UUID...');
    fireEvent.change(entityInputs[0], { target: { value: 'test-entity' } }); // Note: this selects the first placeholder, which is Entity ID

    fireEvent.click(screen.getByText('Filter'));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining('entity_id=test-entity'),
      );
    });
  });
});
