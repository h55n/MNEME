'use client';
import { useState } from 'react';
import { Brain, Check, Copy, FileJson, Shield, Store, Terminal } from 'lucide-react';
import { Reveal } from './Reveal';

function SectionHead({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <div className="max-w-2xl">
      <p className="mono text-xs uppercase tracking-[0.12em] text-tertiary">{eyebrow}</p>
      <h2 className="mt-3 text-[28px] leading-[34px] sm:text-[40px] sm:leading-[46px] font-medium tracking-[-0.02em]">{title}</h2>
      {body && <p className="mt-4 text-body-lg text-neutral-500">{body}</p>}
    </div>
  );
}

const PILLARS = [
  {
    icon: Brain,
    title: 'Portable memory',
    body: 'Memory lives in a vault tied to your keys, not to a model vendor. Export it as JSON and import it anywhere.',
  },
  {
    icon: Shield,
    title: 'Provable erasure',
    body: 'Forgetting a memory records a SHA-256 deletion attestation and a tombstone on Monad. Raw content never goes on-chain.',
  },
  {
    icon: Store,
    title: 'Sell what it knows',
    body: 'List curated knowledge packs on the Memory Market. Sellers keep 80% of every sale, settled in USDC.',
  },
];

export function Pillars() {
  return (
    <section className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-24">
      <div className="grid md:grid-cols-3 gap-5">
        {PILLARS.map(({ icon: Icon, title, body }, i) => (
          <Reveal key={title} delay={i * 0.08}>
            <div className="h-full rounded-2xl border border-border p-6 hover:shadow transition-shadow">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="mt-5 text-headline-md">{title}</h3>
              <p className="mt-2 text-body-md text-neutral-500">{body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

const STEPS = [
  { n: '01', title: 'Create a vault', body: 'One vault per agent, owned by your wallet or identifier. You get an API key.' },
  { n: '02', title: 'Connect your agent', body: 'Add the MCP server to Claude Desktop, Cursor or Windsurf, or call the REST API.' },
  { n: '03', title: 'Write and recall', body: 'The agent stores memories and recalls them by meaning, using vector search.' },
  { n: '04', title: 'Attest and forget', body: 'Writes are hashed on-chain. Deletions leave a tombstone you can show an auditor.' },
];

export function HowItWorks() {
  return (
    <section id="how" className="bg-neutral-100 border-y border-secondary scroll-mt-16">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-24">
        <SectionHead eyebrow="How it works" title="From first write to a deletion receipt in four steps." />
        <ol className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.07}>
              <li className="h-full list-none rounded-2xl bg-white border border-border p-6">
                <span className="mono text-xs text-neutral-400">{s.n}</span>
                <h3 className="mt-3 text-headline-sm">{s.title}</h3>
                <p className="mt-2 text-body-md text-neutral-500">{s.body}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function DeletionProof() {
  return (
    <section id="proof" className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-24 scroll-mt-16">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <SectionHead
            eyebrow="Deletion proof"
            title="Erasure you can show to an auditor."
            body="When a user invokes GDPR Article 17, MNEME removes the memory from your vault, then records a hash of the deletion and a tombstone on Monad. The chain holds no personal data."
          />
          <ul className="mt-6 space-y-3 text-body-md text-neutral-600">
            {[
              'SHA-256 deletion attestation, written by DeletionProver.sol',
              'Immutable tombstone, so the erasure cannot be quietly undone',
              'Not a zero-knowledge proof. It proves a deletion was recorded, not that no copy exists elsewhere.',
            ].map((t) => (
              <li key={t} className="flex gap-3">
                <Check className="w-4 h-4 mt-1 shrink-0 text-success" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <Reveal>
          <div className="rounded-2xl border border-border shadow-md bg-white overflow-hidden">
            <div className="px-5 h-12 flex items-center justify-between border-b border-secondary bg-neutral-100">
              <span className="text-label-md">Deletion receipt</span>
              <span className="text-label-sm text-success inline-flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" /> Tombstoned
              </span>
            </div>
            <dl className="px-5 py-5 grid grid-cols-[110px_1fr] gap-y-3 text-body-sm">
              {[
                ['Request', 'GDPR Art. 17 erasure'],
                ['Memory', 'mem_7f2a… (content removed)'],
                ['Tombstone', '0xf1a4c9…e8d6'],
                ['Contract', 'DeletionProver.sol'],
                ['Network', 'Monad Testnet'],
              ].map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-neutral-400">{k}</dt>
                  <dd className="mono text-xs sm:text-[13px] text-on-surface break-all">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="px-5 pb-4 text-label-sm text-neutral-400">Example receipt. Values are illustrative.</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

const SNIPPETS = {
  mcp: {
    label: 'MCP server',
    icon: Terminal,
    lang: 'claude_desktop_config.json',
    code: `{
  "mcpServers": {
    "mneme-memory": {
      "command": "npx",
      "args": ["-y", "@mneme/mcp"],
      "env": {
        "MNEME_API_URL": "https://mneme-six.vercel.app/api/v1",
        "MNEME_API_KEY": "mnk_live_your-api-key"
      }
    }
  }
}`,
  },
  tools: {
    label: 'Tools',
    icon: FileJson,
    lang: 'what your agent can call',
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
    <section id="developers" className="bg-neutral-100 border-y border-secondary scroll-mt-16">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-24 grid lg:grid-cols-5 gap-12 items-start">
        <div className="lg:col-span-2">
          <SectionHead
            eyebrow="For developers"
            title="One config block and your agent has memory."
            body="MNEME ships a Model Context Protocol server. It works with Claude Desktop, Cursor, Windsurf and any MCP client."
          />
        </div>
        <div className="lg:col-span-3 rounded-2xl border border-border bg-white shadow overflow-hidden min-w-0">
          <div className="flex items-center justify-between border-b border-secondary px-2">
            <div role="tablist" aria-label="Integration examples" className="flex">
              {(Object.keys(SNIPPETS) as (keyof typeof SNIPPETS)[]).map((k) => {
                const Icon = SNIPPETS[k].icon;
                return (
                  <button
                    key={k}
                    role="tab"
                    aria-selected={tab === k}
                    onClick={() => setTab(k)}
                    className={
                      'flex items-center gap-2 h-12 px-4 text-label-md border-b-2 -mb-px transition-colors ' +
                      (tab === k ? 'border-primary text-on-surface' : 'border-transparent text-neutral-400 hover:text-on-surface')
                    }
                  >
                    <Icon className="w-4 h-4" />
                    {SNIPPETS[k].label}
                  </button>
                );
              })}
            </div>
            <button
              onClick={copy}
              className="mr-2 inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-label-sm text-neutral-500 hover:bg-secondary transition-colors"
              aria-label="Copy code"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="px-5 pt-4 mono text-xs text-neutral-400">{snippet.lang}</p>
          <pre className="px-5 pb-5 pt-2 overflow-x-auto text-[13px] leading-6 mono text-neutral-800" tabIndex={0}>
            <code>{snippet.code}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}

export function MarketSection() {
  return (
    <section id="market" className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-24 scroll-mt-16">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <Reveal className="order-2 lg:order-1">
          <div className="rounded-2xl border border-border bg-white shadow-md p-6">
            <p className="text-label-sm text-neutral-400">Knowledge pack</p>
            <h3 className="mt-1 text-headline-md">Contract review playbook</h3>
            <p className="mt-2 text-body-md text-neutral-500">
              Clauses, fallbacks and negotiation notes from 400 reviewed agreements.
            </p>
            <div className="mt-5 flex items-center justify-between">
              <span className="mono text-xs text-neutral-400">PII scan: passed</span>
              <span className="text-label-md">Example listing</span>
            </div>
            <div className="mt-5 h-2 rounded-full bg-secondary overflow-hidden" aria-label="Revenue split 80 percent to seller">
              <div className="h-full w-[80%] bg-primary" />
            </div>
            <p className="mt-2 text-label-sm text-neutral-400">80% to the seller, 20% to the protocol</p>
          </div>
        </Reveal>
        <div className="order-1 lg:order-2">
          <SectionHead
            eyebrow="Memory Market"
            title="Turn what your agent learned into a product."
            body="List a curated pack of domain knowledge. Every submission is scanned for personal data before it goes live, and sellers keep 80% of each sale in USDC."
          />
        </div>
      </div>
    </section>
  );
}

const FAQ = [
  ['Does my data go on-chain?', 'No. Only hashes and tombstones are written to Monad. Memory content stays in your vault.'],
  ['Is the deletion proof a zero-knowledge proof?', 'No. It is a SHA-256 deletion attestation plus an on-chain tombstone. It shows a deletion was recorded at a point in time.'],
  ['Which agents work with it?', 'Any MCP client, including Claude Desktop, Cursor and Windsurf. There is also a REST API and SDKs for TypeScript and Python.'],
  ['What does it cost to start?', 'The free tier includes 1,000 memories a month and needs no credit card.'],
  ['Can I leave?', 'Yes. Export the whole vault as JSON at any time and import it into another vault.'],
];

export function Faq() {
  return (
    <section id="faq" className="bg-neutral-100 border-y border-secondary scroll-mt-16">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-16 sm:py-24">
        <SectionHead eyebrow="FAQ" title="Straight answers." />
        <div className="mt-10 divide-y divide-secondary border-y border-secondary">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between text-headline-sm [&::-webkit-details-marker]:hidden">
                {q}
                <span className="ml-4 text-neutral-400 transition-transform group-open:rotate-45 text-xl leading-none" aria-hidden="true">+</span>
              </summary>
              <p className="mt-3 text-body-md text-neutral-500">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
