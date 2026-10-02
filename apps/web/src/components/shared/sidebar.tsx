'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { useAuthStore } from '@/store';
import {
  Database, Brain, Shield, Settings,
  LogOut, Store, Menu, X
} from 'lucide-react';

const NAV = [
  { label: 'Vault', href: '/dashboard', icon: Database },
  { label: 'Memories', href: '/dashboard/memories', icon: Brain },
  { label: 'Market', href: '/dashboard/market', icon: Store },
  { label: 'Compliance', href: '/dashboard/compliance', icon: Shield },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { vaultName, operatorAddress, plan, clearSession } = useAuthStore();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
    <header className="md:hidden sticky top-0 z-30 flex items-center justify-between h-14 px-4 border-b border-secondary bg-surface">
      <Link href="/" className="block">
        <img src="/mneme.svg" alt="mneme." className="h-7 w-auto" />
      </Link>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close navigation' : 'Open navigation'}
        aria-expanded={open}
        className="flex items-center justify-center w-9 h-9 rounded-md hover:bg-secondary/60 transition-colors"
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>
    </header>
    {open && (
      <div
        className="md:hidden fixed inset-0 z-30 bg-black/40"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
    )}
    <aside
      className={clsx(
        'w-56 shrink-0 border-r border-secondary bg-surface flex flex-col h-screen',
        'fixed inset-y-0 left-0 z-40 transition-transform md:sticky md:top-0 md:z-auto md:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      {/* Logo */}
      <div className="px-5 py-4 border-b border-secondary">
        <Link href="/" className="block">
          <img src="/mneme.svg" alt="mneme." className="h-8 w-auto" />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 flex flex-col gap-0.5">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = href === '/dashboard' ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-2.5 px-3 h-9 rounded-md text-label-md transition-colors',
                active
                  ? 'bg-primary text-white'
                  : 'text-on-surface hover:bg-secondary/60'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-secondary space-y-2">
        {/* Vault info */}
        <div className="px-2 py-2">
          <p className="text-label-sm text-neutral-500 truncate">{vaultName ?? 'My Vault'}</p>
          <p className="mono text-xs text-neutral-400 truncate mt-0.5">
            {operatorAddress ? `${operatorAddress.slice(0, 6)}...${operatorAddress.slice(-4)}` : ''}
          </p>
          {plan && (
            <span className={clsx(
              'inline-block mt-1.5 text-label-sm px-1.5 py-0.5 rounded',
              plan === 'enterprise' ? 'bg-tertiary/10 text-tertiary' :
              plan === 'pro' ? 'bg-primary/10 text-primary' :
              'bg-secondary text-neutral-500'
            )}>
              {plan}
            </span>
          )}
        </div>

        <button
          onClick={clearSession}
          className="flex items-center gap-2 w-full px-3 h-9 rounded-md text-label-md text-neutral-500 hover:bg-secondary/60 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
    </>
  );
}
