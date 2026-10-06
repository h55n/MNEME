'use client';
import { Reveal } from './Reveal';
import { MemoryBrain } from './MemoryBrain';

const LEGEND: [string, string][] = [
  ['#F1EEE7', 'Readable memory'],
  ['#8FD6BE', 'Encrypted'],
  ['#FF9100', 'Erased'],
];

// Art on the left, copy on the right, so the page opens on the product's idea
// before the words. Crop marks and a legend frame the artwork like a plate.
export function Hero() {
  return (
    <section className="bg-[#F1EEE7] text-[#232323] lg:grid lg:grid-cols-12 lg:min-h-screen">
      <div className="order-2 lg:order-1 lg:col-span-7 relative bg-[#232323] text-[#F1EEE7] flex flex-col min-h-[460px] lg:min-h-0 bg-[radial-gradient(65%_45%_at_50%_100%,rgba(143,214,190,0.16),transparent_70%)]">
        {['top-4 left-4', 'top-4 right-4', 'bottom-14 left-4', 'bottom-14 right-4'].map((p) => (
          <span key={p} aria-hidden="true" className={'absolute font-mono text-[14px] leading-none text-[#F1EEE7]/35 ' + p}>+</span>
        ))}
        <div className="flex-1 flex items-center justify-center px-3 pt-20 pb-6 lg:px-6">
          <MemoryBrain className="w-full max-w-[980px] aspect-[5/4]" />
        </div>
        <div className="h-12 border-t border-white/15 px-5 sm:px-8 flex items-center justify-between gap-4 font-mono uppercase text-[11px] text-[#F1EEE7]/60">
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            {LEGEND.map(([c, l]) => (
              <li key={l} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />
                {l}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="order-1 lg:order-2 lg:col-span-5 flex flex-col justify-center px-5 sm:px-8 lg:pl-14 lg:pr-16 pt-12 pb-14 lg:py-16">
        <Reveal>
          <p className="eyebrow mb-5">Sovereign memory for AI agents.</p>
          <h1 className="font-medium text-balance mb-8 text-[clamp(40px,4.6vw,72px)] leading-none">
            Memory your agent owns. Forgetting it, provable.
          </h1>
          <p className="max-w-[460px] text-[clamp(15px,1.3vw,18px)] leading-[1.35] text-[#5B5A56]">
            Keep your agent&apos;s memory when you switch models. Sell what it knows. When someone asks to be forgotten, record a SHA-256 deletion attestation and a tombstone on-chain.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            <a href="#start" className="font-mono uppercase text-[14px] h-12 px-6 inline-flex items-center rounded-lg bg-[#232323] text-[#F1EEE7] hover:bg-[#FF9100] hover:text-[#232323] transition-colors">Get a vault</a>
            <a href="#developers" className="font-mono uppercase text-[14px] h-12 px-6 inline-flex items-center rounded-lg border border-[#232323]/25 text-[#232323] hover:border-[#232323] transition-colors">Add to your agent</a>
          </div>
          <p className="mono mt-4 text-[12px] uppercase text-[#5B5A56]">Free tier · 1,000 memories a month · no card</p>
        </Reveal>
      </div>
    </section>
  );
}
