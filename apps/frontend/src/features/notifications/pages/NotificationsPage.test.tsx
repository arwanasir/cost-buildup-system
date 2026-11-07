import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { api } from '@/lib/api-client';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { NotificationsPage } from './NotificationsPage';

vi.mock('@/lib/api-client', () => ({
  api: { get: vi.fn(), patch: vi.fn() },
}));

describe('notification API integration', () => {
  beforeEach(() => vi.resetAllMocks());

  it('reads the unread count contract and links to notifications', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { count: 2 } });

    renderWithProviders(<NotificationBell />);

    expect(
      await screen.findByRole('link', { name: 'Notifications' }),
    ).toHaveAttribute('href', '/notifications');
    expect(await screen.findByText('2')).toBeInTheDocument();
  });

  it('uses the backend read-all route', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 'notification-1',
            titleEn: 'Approval required',
            bodyEn: 'A purchase order needs review.',
            isRead: false,
            createdAt: '2026-11-01T12:00:00.000Z',
          },
        ],
      },
    });
    vi.mocked(api.patch).mockResolvedValueOnce({ data: { updated: 1 } });

    renderWithProviders(<NotificationsPage />);
    fireEvent.click(await screen.findByText('Mark all as read'));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/notifications/read-all');
    });
  });
});
