import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-white/10">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 flex flex-col sm:flex-row gap-6 sm:items-center justify-between">
        <div>
          <span className="font-display text-[26px] text-white leading-none">mneme<span className="text-[#FF9100]">.</span></span>
          <p className="mt-3 text-[13px] text-[#6B7485]">Sovereign memory for AI agents. MIT licensed.</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-[#9AA3B2]" aria-label="Footer">
          <a href="https://github.com/h55n/MNEME" className="hover:text-white transition-colors">GitHub</a>
          <a href="https://testnet.monadexplorer.com/" className="hover:text-white transition-colors">Monad Explorer</a>
          <Link href="/login" className="hover:text-white transition-colors">Log in</Link>
        </nav>
      </div>
    </footer>
  );
}
