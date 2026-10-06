'use client';

import { useAuthStore } from '@/store';

/** Shown only while the user is in the built-in demo (Try demo on the login page). */
export function DemoBanner() {
  const demo = useAuthStore((s) => s.demo);
  if (!demo) return null;
  return (
    <div
      role="status"
      className="sticky top-0 z-[60] flex items-center justify-center gap-2 border-b border-[#2A2A2A] bg-[#141414] px-4 py-2 text-[12.5px] text-[#B5B5B5]"
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-tertiary" aria-hidden="true" />
      <span>
        <strong className="font-mono uppercase tracking-wide text-white">Demo mode</strong>
        {' '}- sample data only. Nothing here is real or saved.
      </span>
    </div>
  );
}
