'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Auth State (persisted — does NOT store API key) ───────────────────────────
// The API key is intentionally kept in session-only state (see below) to
// prevent XSS attacks from reading it out of localStorage.

interface PersistedAuthState {
  /** Base URL of the MNEME API this session talks to (used when none is built in). */
  apiUrl: string | null;
  vaultId: string | null;
  operatorAddress: string | null;
  vaultName: string | null;
  plan: string | null;
}

interface AuthState extends PersistedAuthState {
  // Session-only (not persisted to localStorage)
  apiKey: string | null;
  /** True only while the user is in the built-in demo; fixture data, never persisted. */
  demo: boolean;
  setSession: (data: { vaultId: string; apiKey: string; operatorAddress: string; vaultName?: string; plan?: string; apiUrl?: string | null; demo?: boolean }) => void;
  /** Remembers the API URL on its own, so the login form can prefill it after logout. */
  setApiUrl: (apiUrl: string | null) => void;
  clearSession: () => void;
}

/** A session is only usable with both halves: the vault and the in-memory key. */
export const selectIsAuthenticated = (s: Pick<AuthState, 'vaultId' | 'apiKey'>) =>
  Boolean(s.vaultId && s.apiKey);

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      apiUrl: null,
      vaultId: null,
      demo: false,
      apiKey: null,          // Not written to localStorage — see partialize below
      operatorAddress: null,
      vaultName: null,
      plan: null,
      setApiUrl: (apiUrl) => set({ apiUrl }),
      setSession: (data) => set((state) => ({
        apiUrl: data.apiUrl === undefined ? state.apiUrl : data.apiUrl,
        vaultId: data.vaultId,
        apiKey: data.apiKey,
        demo: data.demo === true,
        operatorAddress: data.operatorAddress,
        vaultName: data.vaultName ?? null,
        plan: data.plan ?? 'free',
      })),
      // The API URL stays after a logout so the next login is one field shorter.
      clearSession: () => set({ demo: false, vaultId: null, apiKey: null, operatorAddress: null, vaultName: null, plan: null }),
    }),
    {
      name: 'mneme-session',
      // Explicitly exclude apiKey from localStorage — it is kept in memory only.
      // On page reload the user must re-authenticate (or use a wallet signature).
      partialize: (state): PersistedAuthState => ({
        apiUrl: state.apiUrl,
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
