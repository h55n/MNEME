'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  vaultId: string | null;
  apiKey: string | null;
  operatorAddress: string | null;
  vaultName: string | null;
  plan: string | null;
  setSession: (data: { vaultId: string; apiKey: string; operatorAddress: string; vaultName?: string; plan?: string }) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      vaultId: null,
      apiKey: null,
      operatorAddress: null,
      vaultName: null,
      plan: null,
      setSession: (data) => set({
        vaultId: data.vaultId,
        apiKey: data.apiKey,
        operatorAddress: data.operatorAddress,
        vaultName: data.vaultName ?? null,
        plan: data.plan ?? 'free',
      }),
      clearSession: () => set({ vaultId: null, apiKey: null, operatorAddress: null, vaultName: null, plan: null }),
    }),
    {
      name: 'mneme-session',
    }
  )
);

interface UIState {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
