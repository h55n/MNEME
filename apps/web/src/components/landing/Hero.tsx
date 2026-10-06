'use client';
import { ArrowRight } from 'lucide-react';
import { Reveal } from './Reveal';

// Memory constellation. Each node is one stored memory. The dashed node was
// forgotten: its content is gone and only a tombstone remains.
const NODES: [number, number, number][] = [
  [90, 150, 5], [190, 90, 7], [300, 170, 6], [410, 80, 5], [520, 150, 8],
  [630, 100, 6], [720, 190, 5], [250, 260, 5], [380, 250, 7], [560, 270, 5],
  [150, 230, 4], [680, 60, 4], [470, 200, 4],
];
const EDGES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [2, 8], [8, 4], [7, 2], [10, 7],
  [0, 10], [4, 9], [3, 11], [5, 11], [12, 4], [12, 2], [8, 9],
];
const FORGOTTEN = 8;

function Constellation() {
  return (
    <svg viewBox="0 0 810 330" className="w-full h-auto" role="img" aria-label="A graph of memories. One memory has been forgotten and left a tombstone.">
      <defs>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF9100" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#FF9100" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="edge" x1="0" x2="1">
          <stop offset="0%" stopColor="#FF9100" stopOpacity="0.05" />
          <stop offset="50%" stopColor="#FFB74D" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#FF9100" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      {EDGES.map(([a, b], i) => {
        const gone = a === FORGOTTEN || b === FORGOTTEN;
        return (
          <line
            key={i}
            x1={NODES[a][0]} y1={NODES[a][1]} x2={NODES[b][0]} y2={NODES[b][1]}
            stroke={gone ? '#ffffff' : 'url(#edge)'}
            strokeOpacity={gone ? 0.12 : 1}
            strokeDasharray={gone ? '3 5' : undefined}
            strokeWidth="1"
          />
        );
      })}
      {NODES.map(([x, y, r], i) =>
        i === FORGOTTEN ? (
          <g key={i}>
            <circle cx={x} cy={y} r={r + 7} fill="none" stroke="#4FD1C5" strokeOpacity="0.8" strokeDasharray="3 4" />
            <circle cx={x} cy={y} r="3" fill="#4FD1C5" />
            <circle cx={x} cy={y} r="6" fill="none" stroke="#4FD1C5" style={{ animation: 'pulse-ring 2.8s ease-out infinite' }} />
            <text x={x - 12} y={y + 34} textAnchor="end" fill="#4FD1C5" fontSize="11" className="mono">tombstone 0xf1a4…e8d6</text>
          </g>
        ) : (
          <g key={i} style={{ animation: `drift ${5 + (i % 4)}s ease-in-out ${i * 0.3}s infinite` }}>
            <circle cx={x} cy={y} r={r * 5} fill="url(#glow)" />
            <circle cx={x} cy={y} r={r} fill="#FFB74D" />
          </g>
        )
      )}
    </svg>
  );
}

const ROWS = [
  ['write', 'Client prefers Delaware governing law', '0xa3f8…d9b4', 'on-chain'],
  ['write', 'NDA signed 2026-09-18, renews in 12 months', '0xb5d1…f3c6', 'on-chain'],
  ['forget', 'User asked to erase contact details', '0xf1a4…e8d6', 'tombstoned'],
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#07090D] text-white">
      <div aria-hidden className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(60% 50% at 50% 0%, rgba(255,145,0,0.16), transparent 70%), radial-gradient(40% 40% at 85% 30%, rgba(79,209,197,0.08), transparent 70%)',
      }} />
      <div className="relative max-w-6xl mx-auto px-5 sm:px-8 pt-16 sm:pt-24 pb-10 text-center">
        <Reveal>
          <p className="mono text-[12px] uppercase tracking-[0.18em] text-[#9AA3B2]">Sovereign memory for AI agents</p>
          <h1 className="font-display mt-6 text-[52px] leading-[0.98] sm:text-[96px] sm:leading-[0.95] text-balance">
            Memory your agent owns.<br />
            <span className="italic text-[#FFB74D]">Forgetting it can prove.</span>
          </h1>
          <p className="mx-auto mt-7 max-w-xl text-[17px] leading-7 text-[#9AA3B2]">
            Keep your agent&apos;s memory when you switch models. Sell what it knows. Record a deletion attestation on-chain when someone asks to be forgotten.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
            <a href="#start" className="inline-flex h-12 items-center justify-center gap-2 px-6 rounded-full bg-white text-[#07090D] font-medium hover:bg-[#FFB74D] transition-colors">
              Create a free vault <ArrowRight className="w-4 h-4" />
            </a>
            <a href="#developers" className="inline-flex h-12 items-center justify-center px-6 rounded-full border border-white/20 text-white hover:bg-white/10 transition-colors">
              Add it to your agent
            </a>
          </div>
          <p className="mt-4 text-[13px] text-[#6B7485]">Free tier, 1,000 memories a month, no credit card.</p>
        </Reveal>

        <Reveal delay={0.1} className="mt-14 sm:mt-20">
          <div className="mx-auto rounded-2xl border border-white/10 bg-[#0B0F15]/90 shadow-[0_40px_120px_-20px_rgba(255,145,0,0.25)] overflow-hidden text-left">
            <div className="flex items-center gap-2 px-4 h-11 border-b border-white/10">
              <span className="w-2.5 h-2.5 rounded-full bg-white/15" /><span className="w-2.5 h-2.5 rounded-full bg-white/15" /><span className="w-2.5 h-2.5 rounded-full bg-white/15" />
              <span className="mono mx-auto text-[11px] text-[#6B7485]">vault / legal-agent · example data</span>
            </div>
            <div className="px-3 sm:px-8 pt-6"><Constellation /></div>
            <ul className="divide-y divide-white/5 border-t border-white/10">
              {ROWS.map(([op, text, hash, state]) => (
                <li key={hash} className="flex items-center gap-3 px-4 sm:px-6 py-3.5">
                  <span className={'mono text-[10.5px] uppercase tracking-wider px-2 py-0.5 rounded ' + (op === 'forget' ? 'bg-[#4FD1C5]/15 text-[#4FD1C5]' : 'bg-[#FF9100]/15 text-[#FFB74D]')}>{op}</span>
                  <span className="flex-1 text-[14px] text-[#E8EAED] truncate">{text}</span>
                  <span className="hidden sm:inline mono text-[12px] text-[#6B7485]">{hash}</span>
                  <span className={'text-[12px] ' + (op === 'forget' ? 'text-[#4FD1C5]' : 'text-[#9AA3B2]')}>{state}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
