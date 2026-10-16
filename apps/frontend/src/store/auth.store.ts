import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  preferredLanguage?: string;
}

interface AuthState {
  user: User | null;
  permissions: string[];
  accessToken: string | null;

  login: (
    user: User,
    permissions: string[],
    accessToken: string,
    refreshToken: string,
  ) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  setAccessToken: (token: string, refreshToken?: string) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  permissions: [],
  accessToken: null,

  login: (user, permissions, accessToken, refreshToken) => {
    sessionStorage.setItem('refreshToken', refreshToken);
    set({ user, permissions: Array.isArray(permissions) ? permissions : [], accessToken });
  },

  logout: () => {
    sessionStorage.removeItem('refreshToken');
    set({ user: null, permissions: [], accessToken: null });
  },

  hasPermission: (permission: string) => {
    const { permissions, user } = get();

    if (user?.role === 'ADMIN_ALL' || user?.role === 'system_admin') return true;
    if (permissions.includes('admin:all') || permissions.includes('*')) return true;
    return permissions.includes(permission);
  },

  setAccessToken: (token: string, refreshToken?: string) => {
    if (refreshToken) {
      sessionStorage.setItem('refreshToken', refreshToken);
    }
    set({ accessToken: token });
  },
}));
