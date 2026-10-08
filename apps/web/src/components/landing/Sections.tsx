'use client';
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Reveal } from './Reveal';

const WRAP = 'max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20';

function Eyebrow({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return <p className={'eyebrow mb-5 ' + (dark ? 'text-[#F1EEE7]/70' : 'text-[#0A0A0A]')}>{children}</p>;
}
function H2({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return <h2 className={'font-medium text-balance text-[clamp(32px,4vw,48px)] leading-[1.1] ' + (dark ? 'text-[#F1EEE7]' : 'text-[#0A0A0A]')}>{children}</h2>;
}

const PILLARS = [
  ['01', 'Portable memory', 'Memory lives in a vault with API-key access, not in a model vendor\'s memory silo. Export it as JSON and import it anywhere.'],
  ['02', 'Provable erasure', 'Forgetting records a SHA-256 deletion attestation and a tombstone on Monad. Raw content never goes on-chain.'],
  ['03', 'Sell what it knows', 'List curated knowledge packs on the Memory Market. Sellers keep 80% of every sale, settled in USDC.'],
];

export function Pillars() {
  return (
    <section className="bg-[#F1EEE7] text-[#0A0A0A]">
      <div className={WRAP + ' py-20 sm:py-28'}>
        <div className="grid md:grid-cols-3 border-t border-[#0A0A0A]/20">
          {PILLARS.map(([n, t, b], i) => (
            <Reveal key={n} delay={i * 0.06}>
              <div className={'h-full pt-6 pb-10 md:pr-10 ' + (i > 0 ? 'md:border-l md:border-[#0A0A0A]/20 md:pl-10' : '')}>
                <p className="eyebrow text-[#5B5A56]">{n}</p>
                <h3 className="mt-10 mb-3 font-medium text-[clamp(24px,2.4vw,30px)] leading-[1.15]">{t}</h3>
                <p className="text-[16px] leading-[1.35] text-[#5B5A56] max-w-sm">{b}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function DeletionProof() {
  const rows = [
    ['Request', 'The erasure request, such as GDPR Art. 17'],
    ['Memory', 'ID of the removed memory. The content is gone.'],
    ['Tombstone', 'Hash of the on-chain tombstone transaction'],
    ['Contract', 'DeletionProver.sol'],
    ['Network', 'Monad'],
  ];
  return (
    <section id="proof" className="bg-[#0A0A0A] text-[#F1EEE7] scroll-mt-4 overflow-hidden">
      <div className={WRAP + ' pt-20 sm:pt-28'}>
        <p className="font-medium select-none text-[clamp(88px,19vw,280px)] leading-[0.82] tracking-[-0.045em] text-[#F1EEE7]" aria-hidden="true">FORGET.</p>
      </div>
      <div className={WRAP + ' py-16 sm:py-24 grid lg:grid-cols-12 gap-12'}>
        <div className="lg:col-span-5">
          <Eyebrow dark>Deletion proof</Eyebrow>
          <H2 dark>Erasure you can show to an auditor.</H2>
          <p className="mt-6 text-[17px] leading-[1.35] text-[#F1EEE7]/70">
            When a user invokes GDPR Article 17, MNEME removes the memory from your vault, then records a hash of the deletion and a tombstone on Monad. The chain holds no personal data.
          </p>
          <ul className="mt-8 space-y-3 text-[15px] leading-6 text-[#F1EEE7]/80">
            {[
              'SHA-256 deletion attestation, written by DeletionProver.sol',
              'Immutable tombstone, so the erasure cannot be quietly undone',
              'Not a zero-knowledge proof. It proves a deletion was recorded, not that no copy exists elsewhere.',
            ].map((t) => (
              <li key={t} className="flex gap-3"><Check className="w-4 h-4 mt-1 shrink-0 text-[#FF9100]" /><span>{t}</span></li>
            ))}
          </ul>
        </div>
        <Reveal className="lg:col-span-6 lg:col-start-7">
          <div className="rounded-xl border border-white/15 overflow-hidden">
            <div className="flex items-center justify-between px-5 h-12 border-b border-white/15">
              <span className="eyebrow !text-[12px]">Deletion receipt</span>
              <span className="eyebrow !text-[12px] text-[#FF9100] inline-flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#FF9100]" />Tombstoned</span>
            </div>
            <dl className="px-5 py-5 grid grid-cols-[110px_1fr] gap-y-3.5 text-[14px]">
              {rows.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="eyebrow !text-[12px] text-[#F1EEE7]/55 pt-0.5">{k}</dt>
                  <dd className="mono !text-[13px] break-words">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="px-5 pb-4 eyebrow !text-[11px] text-[#F1EEE7]/45">What every deletion receipt records</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

const STEPS = [
  ['01', 'Create a vault', 'One vault per agent, owned by your wallet or identifier. You get an API key.'],
  ['02', 'Connect your agent', 'Add the MCP server to Claude Desktop, Cursor or Windsurf, or call the REST API.'],
  ['03', 'Write and recall', 'The agent stores memories and recalls them by meaning, using vector search.'],
  ['04', 'Attest and forget', 'Writes are hashed on-chain. Deletions leave a tombstone you can show an auditor.'],
];

export function HowItWorks() {
  return (
    <section id="how" className="bg-[#F1EEE7] text-[#0A0A0A] scroll-mt-4">
      <div className={WRAP + ' py-20 sm:py-28'}>
        <Eyebrow>How it works</Eyebrow>
        <H2>From first write to a deletion receipt in four steps.</H2>
        <ol className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 border-t border-[#0A0A0A]/20">
          {STEPS.map(([n, t, b], i) => (
            <Reveal key={n} delay={i * 0.05}>
              <li className={'list-none h-full pt-6 pb-10 lg:pr-8 ' + (i > 0 ? 'lg:border-l lg:border-[#0A0A0A]/20 lg:pl-8' : '')}>
                <p className="eyebrow text-[#5B5A56]">{n}</p>
                <h3 className="mt-8 mb-2 font-medium text-[20px] leading-[1.2]">{t}</h3>
                <p className="text-[15px] leading-[1.4] text-[#5B5A56]">{b}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

const SNIPPETS = {
  mcp: {
    label: 'MCP server',
    file: 'mcp.json (Cursor) / mcp_config.json (Windsurf Cascade)',
    code: `{
  "mcpServers": {
    "mneme-memory": {
      "url": "https://trymneme-api.onrender.com/mcp?vault=YOUR_VAULT_UUID",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}`,
  },
  tools: {
    label: 'Tools',
    file: 'what your agent can call',
    code: `memory_write    store a memory with type, tags, importance
memory_recall   semantic search across stored memories
memory_inspect  what did the agent know at time T?
memory_list     recent memories, paginated
memory_forget   delete one memory and write a tombstone
memory_export   export the whole vault as portable JSON
memory_import   load an exported vault into another one`,
  },
};

export function Developers() {
  const [tab, setTab] = useState<keyof typeof SNIPPETS>('mcp');
  const [copied, setCopied] = useState(false);
  const snippet = SNIPPETS[tab];
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard can be blocked; the code stays selectable */
    }
  };
  return (
    <section id="developers" className="bg-[#0A0A0A] text-[#F1EEE7] scroll-mt-4">
      <div className={WRAP + ' py-20 sm:py-28 grid lg:grid-cols-12 gap-12 items-start'}>
        <div className="lg:col-span-4">
          <Eyebrow dark>For developers</Eyebrow>
          <H2 dark>One config block and your agent has memory.</H2>
          <p className="mt-6 text-[17px] leading-[1.35] text-[#F1EEE7]/70">
            MNEME ships a Model Context Protocol server. It works with Claude Desktop, Cursor, Windsurf and any MCP client.
          </p>
        </div>
        <div className="lg:col-span-7 lg:col-start-6 rounded-xl border border-white/15 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/15 pl-1 pr-2">
            <div role="tablist" aria-label="Integration examples" className="flex">
              {(Object.keys(SNIPPETS) as (keyof typeof SNIPPETS)[]).map((k) => (
                <button
                  key={k}
                  role="tab"
                  aria-selected={tab === k}
                  onClick={() => setTab(k)}
                  className={'eyebrow !text-[12px] h-12 px-4 border-b-2 -mb-px transition-colors ' + (tab === k ? 'border-[#FF9100] text-[#F1EEE7]' : 'border-transparent text-[#F1EEE7]/50 hover:text-[#F1EEE7]')}
                >
                  {SNIPPETS[k].label}
                </button>
              ))}
            </div>
            <button onClick={copy} aria-label="Copy code" className="eyebrow !text-[12px] inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[#F1EEE7]/70 hover:bg-white/10 transition-colors">
              {copied ? <Check className="w-3.5 h-3.5 text-[#FF9100]" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="px-5 pt-4 mono !text-[12px] text-[#F1EEE7]/45">{snippet.file}</p>
          <pre className="px-5 pb-5 pt-2 whitespace-pre-wrap break-words text-[11px] sm:text-[13px] leading-6 mono text-[#F1EEE7]" tabIndex={0}>
            <code>{snippet.code}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}

export function MarketSection() {
  return (
    <section id="market" className="bg-[#F1EEE7] text-[#0A0A0A] scroll-mt-4">
      <div className={WRAP + ' py-20 sm:py-28 grid lg:grid-cols-12 gap-12 items-center'}>
        <div className="lg:col-span-5">
          <Eyebrow>Memory Market</Eyebrow>
          <H2>Turn what your agent learned into a product.</H2>
          <p className="mt-6 text-[17px] leading-[1.35] text-[#5B5A56]">
            List a curated pack of domain knowledge. Every submission is scanned for personal data before it goes live, and sellers keep 80% of each sale in USDC.
          </p>
        </div>
        <Reveal className="lg:col-span-6 lg:col-start-7">
          <div className="rounded-xl border border-[#0A0A0A]/20 bg-[#F8F6F1] p-6 sm:p-8">
            <p className="eyebrow !text-[12px] text-[#5B5A56]">Knowledge pack · how a sale splits</p>
            <h3 className="mt-3 font-medium text-[28px] leading-[1.1]">You set the price in USDC.</h3>
            <p className="mt-3 text-[15px] leading-[1.4] text-[#5B5A56]">List a pack of your agent&apos;s memories. Buyers pay on-chain and ingest the pack into their own vault.</p>
            <div className="mt-8 h-2 rounded-sm bg-[#DEDEDE] overflow-hidden" role="img" aria-label="Revenue split: 80 percent to the seller">
              <div className="h-full w-[80%] bg-[#0A0A0A]" />
            </div>
            <div className="mt-3 flex justify-between eyebrow !text-[12px]">
              <span>80% seller</span><span className="text-[#5B5A56]">20% protocol</span>
            </div>
            <p className="mt-6 eyebrow !text-[12px] text-[#FF9100]">Every listing is PII-scanned first</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

const FAQ = [
  ['Can the hosted server read my memories?', 'Yes. Content is encrypted at rest, but the API holds the server secret used to derive vault keys and decrypts content while processing requests. This is not end-to-end encryption. Self-hosting lets you control that server and its secret.'],
  ['Does my data go on-chain?', 'No. Only hashes and tombstones are written to Monad. Memory content stays in your vault.'],
  ['Is the deletion proof a zero-knowledge proof?', 'No. It is a SHA-256 deletion attestation plus an on-chain tombstone. It shows a deletion was recorded at a point in time.'],
  ['Which agents work with it?', 'Any MCP client, including Claude Desktop, Cursor and Windsurf. There is also a REST API and SDKs for TypeScript and Python.'],
  ['What does it cost to start?', 'The free tier includes 1,000 memories a month and needs no credit card.'],
  ['Can I leave?', 'Yes. Export the whole vault as JSON at any time and import it into another vault.'],
];

export function Faq() {
  return (
    <section id="faq" className="bg-[#F1EEE7] text-[#0A0A0A] scroll-mt-4 border-t border-[#0A0A0A]/20">
      <div className={WRAP + ' py-20 sm:py-28 grid lg:grid-cols-12 gap-10'}>
        <div className="lg:col-span-4"><Eyebrow>FAQ</Eyebrow><H2>Straight answers.</H2></div>
        <div className="lg:col-span-7 lg:col-start-6 divide-y divide-[#0A0A0A]/20 border-y border-[#0A0A0A]/20">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between text-[18px] font-medium [&::-webkit-details-marker]:hidden">
                {q}
                <span className="ml-4 text-[#5B5A56] transition-transform group-open:rotate-45 text-2xl leading-none" aria-hidden="true">+</span>
              </summary>
              <p className="mt-3 text-[15px] leading-[1.45] text-[#5B5A56] max-w-xl">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
