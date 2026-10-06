# Design notes

MNEME's interface follows the design thinking of a public reference,
contentarchitecture.dev. We studied the system and rebuilt it with our own
content, our own visuals and free-licensed type. Nothing is copied: no text, no
assets, no code.

## What the reference does, and why it works

1. **One brand voice, two typefaces.** A neutral grotesque (Geist) carries ideas.
   A monospace (Geist Mono) carries labels, buttons and numbers. Mono in capitals
   reads as "instrument panel": it signals that something is a control or a fact,
   not prose. The pairing replaces colour as the main source of hierarchy.
2. **Restraint in colour.** Warm off-white (#F1EEE7), near-black (#232323), two
   greys, and one accent (#FF9100) used for a single idea only. Because the accent
   is rare, it means something every time it appears.
3. **A split, not a stack.** The hero is copy on the left and a dark, full-bleed
   visual on the right. The page asks you to read and look at once.
4. **The brand name is the artwork.** The hero visual is the product's own words
   set on rings, with dotted rings as rhythm. It is typography doing the job an
   illustration would normally do, so there is nothing to look "stock".
5. **Scale contrast as hierarchy.** Tiny mono labels next to enormous display
   words (weight 500, tight tracking, line height under 1). Few sizes, big jumps.
6. **Hairlines instead of boxes.** Structure comes from 1px rules and whitespace.
   Cards are used only where something is an object (a receipt, a listing).
7. **Honest, specific content.** Numbers, steps and ledgers show real details.
   That specificity is what makes the page feel credible.
8. **Motion with a reason.** Slow rotation and one-time reveals. Nothing bounces.

## How MNEME applies it (its own logic)

- The ring visual is MNEME's own idea: memory words in white, and the ring that
  holds `ERASED` and the tombstone hash in the accent. The accent is reserved for
  forgetting, so the colour carries the product's one promise.
- The giant `FORGET.` section sits on the dark panel, where the deletion proof is
  shown as a receipt in mono, like a ledger.
- The dashboard uses the same tokens: cream canvas, hairline cards, mono
  uppercase labels for statuses and stat names, Geist for headings.
- Claims stay exact: a SHA-256 deletion attestation plus an on-chain tombstone.
  Not a zero-knowledge proof. Example data is labelled as example.

## Fonts

Geist and Geist Mono, SIL Open Font License 1.1. License text is in
`apps/web/src/fonts/OFL-Geist.txt`.
