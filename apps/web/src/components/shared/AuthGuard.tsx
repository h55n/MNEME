'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { logoutState, useAuthHydrated, useIsAuthenticated } from '@/lib/auth';
import { Spinner } from '@/components/ui';

/**
 * Keeps signed-out visitors out of the dashboard. It waits for the saved
 * session to load, so a signed-in visitor isn't bounced on first paint, and
 * remembers where they were headed so login can return them there.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useAuthHydrated();
  const authenticated = useIsAuthenticated();

  useEffect(() => {
    if (authenticated) logoutState.active = false;
    if (hydrated && !authenticated) {
      router.replace(logoutState.active ? '/login' : `/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [hydrated, authenticated, pathname, router]);

  if (!hydrated || !authenticated) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center" role="status" aria-label="Checking your session">
        <Spinner />
      </div>
    );
  }
  return <>{children}</>;
}
