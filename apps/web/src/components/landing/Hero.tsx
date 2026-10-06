'use client';
import { Reveal } from './Reveal';

// Rings of mono text around a centre. Same idea as the reference's type
// spiral, rebuilt from MNEME's own words. The accent ring is the tombstone.
const RINGS: { r: number; text: string; dur: number; rev?: boolean; accent?: boolean; size: number }[] = [
  { r: 330, text: 'KEEP YOUR MEMORY · SWITCH MODELS · SELL WHAT IT KNOWS · ', dur: 120, size: 20 },
  { r: 262, text: 'WRITE · RECALL · INSPECT · EXPORT · IMPORT · ', dur: 90, rev: true, size: 18 },
  { r: 200, text: 'ERASED · ERASED · ERASED · TOMBSTONE 0xF1A4…E8D6 · ', dur: 70, accent: true, size: 16 },
  { r: 144, text: 'SHA-256 · MONAD · ATTESTED · ', dur: 55, rev: true, size: 14 },
  { r: 96, text: 'MNEME · MNEME · MNEME · ', dur: 40, size: 13 },
];

function Rings() {
  return (
    <svg viewBox="-360 -360 720 720" className="w-[135%] max-w-none h-auto" role="img" aria-label="Rings of text turning around a centre: keep, write, erased, attested.">
      <defs>
        {RINGS.map((g, i) => (
          <path key={i} id={`ring-${i}`} d={`M ${-g.r} 0 a ${g.r} ${g.r} 0 1 1 ${g.r * 2} 0 a ${g.r} ${g.r} 0 1 1 ${-g.r * 2} 0`} />
        ))}
      </defs>
      {RINGS.map((g, i) => (
        <g key={i} className="spin-ring" style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: `${g.rev ? 'spin-slow-rev' : 'spin-slow'} ${g.dur}s linear infinite` }}>
          <text className="mono" fontSize={g.size} letterSpacing="0.08em" fill={g.accent ? '#FF9100' : '#F1EEE7'} fillOpacity={g.accent ? 1 : 0.88}>
            <textPath href={`#ring-${i}`} startOffset="0" textLength={2 * Math.PI * g.r - 4} lengthAdjust="spacing">{g.text.repeat(Math.max(1, Math.round((2 * Math.PI * g.r) / (g.size * 0.68 * g.text.length))))}</textPath>
          </text>
        </g>
      ))}
      <circle r="5" fill="#FF9100" />
      {[345, 296, 230, 172, 120, 72].map((r) => (
        <circle key={r} r={r} fill="none" stroke="#F1EEE7" strokeOpacity="0.4" strokeDasharray="0.1 11" strokeLinecap="round" strokeWidth="3" />
      ))}
    </svg>
  );
}

export function Hero() {
  return (
    <section className="bg-[#F1EEE7] text-[#232323] lg:grid lg:grid-cols-12 lg:min-h-screen">
      <div className="lg:col-span-5 flex flex-col justify-center px-5 sm:px-8 lg:pl-20 lg:pr-0 pt-32 pb-14 lg:py-16">
        <Reveal>
          <p className="eyebrow mb-5">Sovereign memory for AI agents.</p>
          <h1 className="font-medium text-balance mb-8 text-[clamp(40px,5.2vw,80px)] leading-none">
            Memory your agent owns.<br />Forgetting it, provable.
          </h1>
          <p className="max-w-[460px] text-[clamp(15px,1.3vw,18px)] leading-[1.35] text-[#5B5A56]">
            Keep your agent&apos;s memory when you switch models. Sell what it knows. When someone asks to be forgotten, record a SHA-256 deletion attestation and a tombstone on-chain.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            <a href="#start" className="font-mono uppercase text-[14px] h-12 px-6 inline-flex items-center rounded-lg bg-[#232323] text-[#F1EEE7] hover:bg-[#FF9100] hover:text-[#232323] transition-colors">Get a vault</a>
            <a href="#developers" className="font-mono uppercase text-[14px] h-12 px-6 inline-flex items-center rounded-lg bg-[#DEDEDE] text-[#232323] hover:bg-[#CBCBCB] transition-colors">Add to your agent</a>
          </div>
          <p className="mono mt-4 text-[12px] uppercase text-[#5B5A56]">Free tier · 1,000 memories a month · no card</p>
        </Reveal>
      </div>
      <div className="lg:col-span-7 relative bg-[#232323] overflow-hidden h-[78vh] lg:h-auto flex items-center justify-center">
        <Rings />
        <div className="absolute left-4 bottom-4 sm:left-6 sm:bottom-6 font-mono uppercase text-[11px] text-[#F1EEE7]/55">example data · vault / legal-agent</div>
        <div className="absolute right-4 bottom-4 sm:right-6 sm:bottom-6 flex items-center gap-2 font-mono uppercase text-[11px] text-[#FF9100]"><span className="w-1.5 h-1.5 rounded-full bg-[#FF9100]" style={{ animation: 'blink-dot 2s infinite' }} />1 memory erased</div>
      </div>
    </section>
  );
}
