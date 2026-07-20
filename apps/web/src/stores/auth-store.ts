import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthPrincipal, TenantSummary } from '@/lib/api/types';
import { configureApiClient } from '@/lib/api/client';

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  principal: AuthPrincipal | null;
  tenant: TenantSummary | null;
  hydrated: boolean;
  setTokens: (tokens: { accessToken: string; refreshToken: string } | null) => void;
  setPrincipal: (principal: AuthPrincipal | null) => void;
  setTenant: (tenant: TenantSummary | null) => void;
  setHydrated: (value: boolean) => void;
  clear: () => void;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: readonly string[]) => boolean;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      principal: null,
      tenant: null,
      hydrated: false,
      setTokens: (tokens) =>
        set({
          accessToken: tokens?.accessToken ?? null,
          refreshToken: tokens?.refreshToken ?? null,
        }),
      setPrincipal: (principal) => set({ principal }),
      setTenant: (tenant) => set({ tenant }),
      setHydrated: (hydrated) => set({ hydrated }),
      clear: () =>
        set({
          accessToken: null,
          refreshToken: null,
          principal: null,
          tenant: null,
        }),
      hasPermission: (permission) => {
        const principal = get().principal;
        if (!principal) {
          return false;
        }
        if (principal.roles.includes('SuperAdmin')) {
          return true;
        }
        return principal.permissions.includes(permission);
      },
      hasAnyPermission: (permissions) => permissions.some((p) => get().hasPermission(p)),
    }),
    {
      name: 'onecare.auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);

configureApiClient({
  getAccessToken: () => useAuthStore.getState().accessToken,
  getRefreshToken: () => useAuthStore.getState().refreshToken,
  setTokens: (tokens) => useAuthStore.getState().setTokens(tokens),
});
