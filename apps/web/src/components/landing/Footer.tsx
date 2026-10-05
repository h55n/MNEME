import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-secondary">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 flex flex-col sm:flex-row gap-6 sm:items-center justify-between">
        <div>
          <img src="/mneme.svg" alt="mneme." className="h-6 w-auto" />
          <p className="mt-3 text-body-sm text-neutral-400">Sovereign memory for AI agents. MIT licensed.</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-label-md text-neutral-500" aria-label="Footer">
          <a href="https://github.com/h55n/MNEME" className="hover:text-on-surface transition-colors">GitHub</a>
          <a href="https://testnet.monadexplorer.com/" className="hover:text-on-surface transition-colors">Monad Explorer</a>
          <Link href="/login" className="hover:text-on-surface transition-colors">Log in</Link>
        </nav>
      </div>
    </footer>
  );
}
