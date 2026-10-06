import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-[#232323] text-[#F1EEE7] border-t border-white/15">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20 py-10 flex flex-col sm:flex-row gap-6 sm:items-center justify-between">
        <div>
          <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#FF9100]" /><span className="font-mono uppercase text-[13px] font-medium">mneme</span></span>
          <p className="mt-3 font-mono uppercase text-[11px] text-[#F1EEE7]/50">Sovereign memory for AI agents. MIT licensed.</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 font-mono uppercase text-[12px] text-[#F1EEE7]/60" aria-label="Footer">
          <a href="https://github.com/h55n/MNEME" className="hover:text-white transition-colors">GitHub</a>
          <a href="https://testnet.monadexplorer.com/" className="hover:text-white transition-colors">Monad Explorer</a>
          <Link href="/login" className="hover:text-white transition-colors">Log in</Link>
        </nav>
      </div>
    </footer>
  );
}
