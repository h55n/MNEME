'use client';
import Link from 'next/link';

const LINKS: [string, string][] = [
  ['How it works', '#how'],
  ['Proof', '#proof'],
  ['Developers', '#developers'],
  ['Market', '#market'],
  ['FAQ', '#faq'],
];

// Floating dark bar, mono uppercase labels, one accent dot.
export function Nav() {
  return (
    <header className="fixed top-3 sm:top-4 left-0 right-0 z-40 flex justify-center px-3 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-1 sm:gap-2 rounded-lg bg-[#232323] text-[#F1EEE7] pl-3 pr-1.5 h-12 ring-1 ring-white/10">
        <Link href="/" className="flex items-center gap-2 pr-2 sm:pr-4" aria-label="mneme home">
          <span className="w-2 h-2 rounded-full bg-[#FF9100]" />
          <span className="font-mono uppercase text-[13px] tracking-[0.02em] font-medium">mneme</span>
        </Link>
        <nav className="hidden md:flex items-center" aria-label="Primary">
          {LINKS.map(([l, h]) => (
            <a key={h} href={h} className="font-mono uppercase text-[12px] px-3 h-9 inline-flex items-center text-[#F1EEE7]/65 hover:text-[#F1EEE7] transition-colors">{l}</a>
          ))}
        </nav>
        <Link href="/login" className="font-mono uppercase text-[12px] px-3 h-9 inline-flex items-center text-[#F1EEE7]/65 hover:text-[#F1EEE7] transition-colors">Log in</Link>
        <a href="#start" className="font-mono uppercase text-[12px] px-3.5 h-9 inline-flex items-center rounded-md bg-[#F1EEE7] text-[#232323] hover:bg-[#FF9100] transition-colors">
          Create vault
        </a>
      </div>
    </header>
  );
}
