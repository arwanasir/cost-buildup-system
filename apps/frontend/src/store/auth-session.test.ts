import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { api } from '@/lib/api-client';
import { initializeAuthSession } from './auth-session';
import { useAuthStore } from './auth.store';

vi.mock('axios', () => ({ default: { post: vi.fn() } }));
vi.mock('@/lib/api-client', () => ({ api: { get: vi.fn() } }));

describe('initializeAuthSession', () => {
  beforeEach(() => {
    sessionStorage.clear();
    useAuthStore.setState({
      user: null,
      permissions: [],
      accessToken: null,
      initialized: false,
    });
    vi.mocked(axios.post).mockReset();
    vi.mocked(api.get).mockReset();
  });

  it('finishes initialization without a stored refresh token', async () => {
    await initializeAuthSession();

    expect(useAuthStore.getState().initialized).toBe(true);
    expect(useAuthStore.getState().user).toBeNull();
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('rotates the refresh token and restores user permissions', async () => {
    sessionStorage.setItem('refreshToken', 'old-refresh-token');
    vi.mocked(axios.post).mockResolvedValue({
      data: {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      },
    });
    vi.mocked(api.get).mockResolvedValue({
      data: {
        id: 'user-1',
        email: 'admin@example.com',
        fullName: 'Admin User',
        role: 'system_admin',
        preferred_language: 'am',
        permissions: ['po:read'],
      },
    });

    await initializeAuthSession();

    expect(sessionStorage.getItem('refreshToken')).toBe('new-refresh-token');
    expect(useAuthStore.getState()).toMatchObject({
      accessToken: 'new-access-token',
      initialized: true,
      permissions: ['po:read'],
      user: { id: 'user-1', preferredLanguage: 'am' },
    });
    expect(api.get).toHaveBeenCalledWith('/auth/me');
  });

  it('clears an invalid session and allows the login screen to render', async () => {
    sessionStorage.setItem('refreshToken', 'expired-refresh-token');
    vi.mocked(axios.post).mockRejectedValue(new Error('expired'));

    await initializeAuthSession();

    expect(sessionStorage.getItem('refreshToken')).toBeNull();
    expect(useAuthStore.getState()).toMatchObject({
      accessToken: null,
      initialized: true,
      user: null,
    });
  });
});
