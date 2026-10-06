'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const LINKS = [
  ['How it works', '#how'],
  ['Deletion proof', '#proof'],
  ['Developers', '#developers'],
  ['Market', '#market'],
  ['FAQ', '#faq'],
];

export function Nav() {
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const on = () => setSolid(window.scrollY > 12);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  return (
    <header
      className={
        'sticky top-0 z-40 transition-colors ' +
        (solid ? 'bg-[#07090D]/85 backdrop-blur border-b border-white/10' : 'bg-transparent border-b border-transparent')
      }
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="font-display text-[26px] text-white leading-none" aria-label="mneme home">
          mneme<span className="text-[#FF9100]">.</span>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-[14px] text-[#9AA3B2]" aria-label="Primary">
          {LINKS.map(([l, h]) => (
            <a key={h} href={h} className="hover:text-white transition-colors">{l}</a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden sm:inline-flex h-9 items-center px-3 text-[14px] text-[#9AA3B2] hover:text-white transition-colors">Log in</Link>
          <a href="#start" className="inline-flex h-9 items-center px-4 rounded-full bg-white text-[#07090D] text-[14px] font-medium hover:bg-[#FFB74D] transition-colors">
            Create a vault
          </a>
        </div>
      </div>
    </header>
  );
}
