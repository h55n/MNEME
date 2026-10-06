'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

const LINKS: [string, string][] = [
  ['How it works', '#how'],
  ['Proof', '#proof'],
  ['Developers', '#developers'],
  ['Market', '#market'],
  ['FAQ', '#faq'],
];

const LINK = 'font-mono uppercase text-[12px] px-3 h-9 inline-flex items-center text-[#F1EEE7]/65 hover:text-[#F1EEE7] transition-colors';

// Floating dark bar, mono uppercase labels, one accent dot. Below md the
// section links move into a menu.
export function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <header
      className="fixed left-0 right-0 z-40 flex justify-center px-3 pointer-events-none top-3 sm:top-4"
    >
      <div className="pointer-events-auto w-full max-w-fit rounded-lg bg-black/90 backdrop-blur-md text-[#F1EEE7] ring-1 ring-white/30 shadow-[0_10px_32px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-1 sm:gap-2 pl-3 pr-1.5 h-12">
          <Link href="/" className="flex items-center gap-2 pr-2 sm:pr-4" aria-label="mneme home">
            <span className="w-2 h-2 rounded-full bg-[#FF9100]" />
            <span className="font-mono uppercase text-[13px] tracking-[0.02em] font-medium">mneme</span>
          </Link>
          <nav className="hidden md:flex items-center" aria-label="Primary">
            {LINKS.map(([l, h]) => (
              <a key={h} href={h} className={LINK}>{l}</a>
            ))}
          </nav>
          <Link href="/login" className={LINK}>Log in</Link>
          <a href="#start" className="font-mono uppercase text-[12px] px-3.5 h-9 inline-flex items-center rounded-md bg-[#F1EEE7] text-[#232323] hover:bg-[#FF9100] transition-colors">
            Create vault
          </a>
          <button
            type="button"
            className="md:hidden h-9 w-9 inline-flex items-center justify-center rounded-md text-[#F1EEE7] hover:bg-white/10"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
        {open && (
          <nav id="mobile-menu" aria-label="Sections" className="md:hidden border-t border-white/10 py-1">
            {LINKS.map(([l, h]) => (
              <a key={h} href={h} onClick={() => setOpen(false)} className={LINK + ' w-full h-11 !text-[13px]'}>{l}</a>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
