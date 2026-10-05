'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

const LINKS = [
  { label: 'How it works', href: '#how' },
  { label: 'Deletion proof', href: '#proof' },
  { label: 'Developers', href: '#developers' },
  { label: 'Market', href: '#market' },
  { label: 'FAQ', href: '#faq' },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur border-b border-secondary">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center" aria-label="mneme home">
          <img src="/mneme.svg" alt="mneme." className="h-7 w-auto" />
        </Link>
        <nav className="hidden md:flex items-center gap-7" aria-label="Primary">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-label-md text-neutral-500 hover:text-on-surface transition-colors">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-3">
          <Link href="/login" className="text-label-md text-neutral-600 hover:text-on-surface transition-colors">
            Log in
          </Link>
          <a
            href="#start"
            className="inline-flex items-center h-9 px-4 rounded-lg bg-primary text-primary-foreground text-label-md hover:bg-primary/90 transition-colors"
          >
            Create a vault
          </a>
        </div>
        <button
          type="button"
          className="md:hidden flex items-center justify-center w-10 h-10 rounded-md hover:bg-secondary"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
      {open && (
        <nav className="md:hidden border-t border-secondary bg-white px-5 py-3 flex flex-col" aria-label="Mobile">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="py-3 text-label-md text-neutral-700 border-b border-secondary last:border-0"
            >
              {l.label}
            </a>
          ))}
          <a href="#start" onClick={() => setOpen(false)} className="mt-3 inline-flex justify-center items-center h-11 rounded-lg bg-primary text-primary-foreground text-label-md">
            Create a vault
          </a>
        </nav>
      )}
    </header>
  );
}
