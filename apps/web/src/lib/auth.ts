'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { selectIsAuthenticated, useAuthStore } from '@/store';

/** The API URL baked into the build, if any. */
export const BUILT_IN_API_URL = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '');

/**
 * Accepts only a path on this site ("/dashboard/settings"), never another
 * origin ("//evil.example", "https://evil.example", "/\\evil.example"), so a
 * crafted ?next= link can't send someone away after login.
 */
export function safeNextPath(next: string | null | undefined, fallback = '/dashboard'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return fallback;
  // Never bounce back to the login page itself.
  if (next === '/login' || next.startsWith('/login?') || next.startsWith('/login/')) return fallback;
  return next;
}

/** Normalises what someone types into the API URL field; null when it isn't a usable http(s) URL. */
export function normalizeApiUrl(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `${/^(localhost|127\.|0\.0\.0\.0|\[::1\])/i.test(value) ? 'http' : 'https'}://${value}`);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return `${url.origin}${url.pathname}`.replace(/\/+$/, '');
  } catch {
    return null;
  }
}

/** True once the saved session has been read from localStorage (false during the first render). */
export function useAuthHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useAuthStore.persist.hasHydrated());
  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) setHydrated(true);
    return useAuthStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);
  return hydrated;
}

export function useIsAuthenticated(): boolean {
  return useAuthStore(selectIsAuthenticated);
}

/** Set while logging out, so the dashboard guard doesn't turn that into a "come back here" link. */
export const logoutState = { active: false };

/** Ends the session: forgets the key, drops every cached response and goes to the login page. */
export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const clearSession = useAuthStore((s) => s.clearSession);
  return useCallback(() => {
    logoutState.active = true;
    clearSession();
    queryClient.clear();
    router.replace('/login');
  }, [clearSession, queryClient, router]);
}
