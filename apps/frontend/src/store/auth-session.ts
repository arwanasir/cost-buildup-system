import axios from 'axios';
import { api } from '@/lib/api-client';
import { env } from '@/lib/env';
import { useAuthStore, type User } from './auth.store';

interface ProfileResponse extends User {
  permissions?: string[];
  preferred_language?: string;
}

let initialization: Promise<void> | null = null;

export function initializeAuthSession(): Promise<void> {
  if (initialization) return initialization;

  initialization = (async () => {
    const refreshToken = sessionStorage.getItem('refreshToken');
    if (!refreshToken) {
      useAuthStore.getState().completeInitialization();
      return;
    }

    try {
      const { data: tokens } = await axios.post<{
        accessToken: string;
        refreshToken: string;
      }>(`${env.VITE_API_URL}/auth/refresh`, { refreshToken });

      useAuthStore
        .getState()
        .setAccessToken(tokens.accessToken, tokens.refreshToken);
      const { data: profile } = await api.get<ProfileResponse>('/auth/me');
      const { permissions = [], preferred_language, ...user } = profile;
      useAuthStore.getState().restore(
        {
          ...user,
          preferredLanguage: preferred_language ?? user.preferredLanguage,
        },
        permissions,
        tokens.accessToken,
        tokens.refreshToken,
      );
    } catch {
      useAuthStore.getState().logout();
    }
  })().finally(() => {
    initialization = null;
    useAuthStore.getState().completeInitialization();
  });

  return initialization;
}
