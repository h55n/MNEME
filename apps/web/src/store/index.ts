'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Auth State (persisted — does NOT store API key) ───────────────────────────
// The API key is intentionally kept in session-only state (see below) to
// prevent XSS attacks from reading it out of localStorage.

interface PersistedAuthState {
  vaultId: string | null;
  operatorAddress: string | null;
  vaultName: string | null;
  plan: string | null;
}

interface AuthState extends PersistedAuthState {
  // Session-only (not persisted to localStorage)
  apiKey: string | null;
  setSession: (data: { vaultId: string; apiKey: string; operatorAddress: string; vaultName?: string; plan?: string }) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      vaultId: null,
      apiKey: null,          // Not written to localStorage — see partialize below
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
      // Explicitly exclude apiKey from localStorage — it is kept in memory only.
      // On page reload the user must re-authenticate (or use a wallet signature).
      partialize: (state): PersistedAuthState => ({
        vaultId: state.vaultId,
        operatorAddress: state.operatorAddress,
        vaultName: state.vaultName,
        plan: state.plan,
      }),
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
