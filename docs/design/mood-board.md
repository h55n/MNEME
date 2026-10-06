# Landing page mood board (v2)

Public references reviewed from screenshots, no login: linear.app, vercel.com, supermemory.ai, mem0.ai, railway.com, cursor.com. Mobbin's public explore page loads but its screens need an account, so no Mobbin screens were used.

## What we took

| Reference | Pattern | In MNEME |
| --- | --- | --- |
| Railway | Dark, atmospheric full-bleed hero with a serif headline and a framed app window | Near-black page, warm amber glow behind the hero, serif display headline, framed vault window |
| Cursor | Serif-led headline and a real product window as the hero visual | Instrument Serif for display type, the window shows live-looking vault activity |
| Linear | Quiet neutral surfaces, thin borders, one bright action | 1px white-on-dark borders, white pill CTA |
| supermemory | Monospace labels, code-first developer section | JetBrains Mono eyebrows, MCP config tabs with a copy button |
| Vercel | Strong contrast and generous spacing | Section padding of 80 to 128px, large type |

## Visual idea

Memory as a constellation. Each stored memory is a glowing amber node. The memory that was forgotten becomes a dashed teal ring with a tombstone hash, so the hero shows the product promise (portable memory plus provable erasure) without a stock illustration.

## Type and colour

- Display: Instrument Serif. Body: Inter. Mono: JetBrains Mono (all via next/font).
- Background #07090D, surface #0E1218, text #E8EAED, muted #9AA3B2, accent amber #FF9100 / #FFB74D, proof teal #4FD1C5.
- Light mode: the app dashboard stays light. The marketing page is dark by design.

## Rules we kept

- Claims match the README: SHA-256 attestation plus on-chain tombstone, explicitly not a zero-knowledge proof; 80/20 market split; 1,000 free memories a month.
- Example data is labelled as example data. No invented prices.
