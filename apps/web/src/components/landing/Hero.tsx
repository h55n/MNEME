'use client';
import { ArrowRight, Check, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

// Product frame: one agent memory moving through write, attest and forget.
// The values are illustrative and the frame is labeled as such.
const ROWS = [
  { kind: 'WRITE', text: 'Client prefers Delaware governing law', hash: '0xa3f8c2…d9b4', state: 'On-chain' },
  { kind: 'WRITE', text: 'NDA signed 2026-09-18, renewal in 12 months', hash: '0xb5d1a9…f3c6', state: 'On-chain' },
  { kind: 'FORGET', text: 'User asked to erase personal contact details', hash: '0xf1a4c9…e8d6', state: 'Tombstoned' },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage:
            'radial-gradient(60% 50% at 50% 0%, rgba(240,131,0,0.10), rgba(255,255,255,0) 70%), linear-gradient(to right, rgba(0,0,0,0.04) 1px, transparent 1px)',
          backgroundSize: 'auto, 64px 100%',
        }}
      />
      <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-16 sm:pt-24 pb-14">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-secondary-border bg-white text-label-sm text-neutral-600">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
            Live on Monad Testnet
          </span>
          <h1 className="mt-6 text-[40px] leading-[44px] sm:text-[64px] sm:leading-[68px] font-medium tracking-[-0.03em]">
            Memory your agent owns,
            <br className="hidden sm:block" /> and can prove it forgot.
          </h1>
          <p className="mt-6 text-body-lg sm:text-[18px] sm:leading-[28px] text-neutral-500 max-w-xl">
            MNEME is portable memory for AI agents. Keep it when you switch models, sell what your
            agent knows, and record an on-chain deletion attestation when someone asks to be forgotten.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <a
              href="#start"
              className="inline-flex items-center justify-center h-12 px-6 rounded-xl bg-primary text-primary-foreground text-label-md hover:shadow-glow transition-shadow"
            >
              Create a free vault <ArrowRight className="w-4 h-4 ml-2" />
            </a>
            <a
              href="#developers"
              className="inline-flex items-center justify-center h-12 px-6 rounded-xl border border-border text-label-md hover:bg-surface-hover transition-colors"
            >
              Add it to your agent
            </a>
          </div>
          <p className="mt-4 text-body-sm text-neutral-400">
            Free tier, 1,000 memories a month, no credit card.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="mt-14 rounded-2xl border border-border bg-white shadow-md overflow-hidden"
          aria-label="Example vault activity"
        >
          <div className="flex items-center justify-between px-5 h-12 border-b border-secondary bg-neutral-100">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="w-2.5 h-2.5 rounded-full bg-neutral-300" />
              <span className="w-2.5 h-2.5 rounded-full bg-neutral-300" />
              <span className="w-2.5 h-2.5 rounded-full bg-neutral-300" />
            </div>
            <span className="mono text-xs text-neutral-400">vault / legal-agent · example data</span>
            <span className="hidden sm:inline text-label-sm text-neutral-400">Activity</span>
          </div>
          <ul>
            {ROWS.map((r, i) => (
              <motion.li
                key={r.hash}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.18, duration: 0.45 }}
                className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-5 py-4 border-b border-secondary last:border-0"
              >
                <span
                  className={
                    'w-fit text-label-sm px-2 py-0.5 rounded ' +
                    (r.kind === 'FORGET' ? 'bg-tertiary/10 text-tertiary' : 'bg-primary text-primary-foreground')
                  }
                >
                  {r.kind}
                </span>
                <span className="flex-1 text-body-md text-on-surface">{r.text}</span>
                <span className="mono text-xs text-neutral-400">{r.hash}</span>
                <span className="inline-flex items-center gap-1 text-label-sm text-success">
                  {r.kind === 'FORGET' ? <Shield className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                  {r.state}
                </span>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
