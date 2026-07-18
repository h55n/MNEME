---
version: alpha
name: Content Architecture
description: A stark, system-native error-state UI with minimal chrome, dense type, and one warm accent.
colors:
  primary: "#171717"
  secondary: "#E5E7EB"
  tertiary: "#FF9100"
  neutral: "#FFFFFF"
  surface: "#FFFFFF"
  on-surface: "#171717"
  error: "#D92D20"
  primary-contrast: "#FFFFFF"
  border-subtle: "#00000014"
typography:
  headline-display:
    fontFamily: system-ui
    fontSize: 24px
    fontWeight: 500
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: ui-sans-serif
    fontSize: 21px
    fontWeight: 500
    lineHeight: 25px
    letterSpacing: 0px
  headline-md:
    fontFamily: ui-sans-serif
    fontSize: 18px
    fontWeight: 500
    lineHeight: 22px
    letterSpacing: 0px
  headline-sm:
    fontFamily: ui-sans-serif
    fontSize: 16px
    fontWeight: 500
    lineHeight: 19px
    letterSpacing: 0px
  body-lg:
    fontFamily: system-ui
    fontSize: 16px
    fontWeight: 400
    lineHeight: 24px
    letterSpacing: 0px
  body-md:
    fontFamily: system-ui
    fontSize: 14px
    fontWeight: 400
    lineHeight: 21px
    letterSpacing: 0px
  body-sm:
    fontFamily: system-ui
    fontSize: 12px
    fontWeight: 400
    lineHeight: 18px
    letterSpacing: 0px
  label-lg:
    fontFamily: ui-sans-serif
    fontSize: 16px
    fontWeight: 400
    lineHeight: 19px
    letterSpacing: 0px
  label-md:
    fontFamily: ui-sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 21px
    letterSpacing: 0px
  label-sm:
    fontFamily: ui-sans-serif
    fontSize: 12px
    fontWeight: 500
    lineHeight: 16px
    letterSpacing: 0.04em
rounded:
  none: 0px
  sm: 4px
  md: 6px
  lg: 8px
  xl: 12px
  full: 9999px
spacing:
  xs: 12px
  sm: 20px
  md: 24px
  lg: 28px
  xl: 32px
  gutter: 24px
  section: 32px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-contrast}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: 8px 16px
    height: 40px
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: 8px 16px
    height: 40px
  button-link:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.none}"
    padding: 0px
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: 16px
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 8px 12px
    height: 40px
---

# Content Architecture

## Overview
Content Architecture feels like a browser-native utility interface: calm, sparse, and highly functional. The page is centered on a single error message, so the system should stay restrained, readable, and unembellished. The tone is professional and slightly severe, with just enough warmth from the orange accent to guide action.

## Colors
- **Primary (#171717):** A near-black ink used for the main message, button fill, and most actionable text. It gives the interface its crisp, browser-default seriousness.
- **Secondary (#E5E7EB):** A light neutral border tone that supports subtle separation without adding visual weight. Use it for cards, input outlines, and quiet dividers.
- **Tertiary (#FF9100):** A vivid amber accent seen as the system’s only expressive color family. Reserve it for emphasis, alerts, or rare highlights so it remains impactful.
- **Surface (#FFFFFF):** The dominant page and component background, creating an almost empty canvas.
- **On-surface (#171717):** The default readable text color on light backgrounds, matching the primary ink.
- **Primary-contrast (#FFFFFF):** White text for dark-filled controls, especially the primary button.
- **Border-subtle (#00000014):** A translucent hairline border used for very soft delineation, especially on secondary buttons.
- **Error (#D92D20):** A semantic error tone for future validation and failure states; it should stay reserved and not compete with the orange accent.

## Typography
The system uses system-native sans-serif stacks, which keeps the experience fast, familiar, and browser-like. Headings are medium weight with compact leading, while body copy is smaller and relaxed enough for short messages and instructions. The visible hierarchy is simple: a larger headline for the error statement, smaller body text for guidance, and button labels that match the body scale rather than feeling overly promotional.

Use `headline-display`, `headline-lg`, `headline-md`, and `headline-sm` for concise section and page titles. Use `body-md` as the default paragraph style, with `body-lg` for more prominent explanatory copy and `body-sm` for supportive metadata. Labels and controls should rely on `label-md` for ordinary actions and `label-sm` when a compact, slightly more emphatic UI label is needed. Letter spacing is mostly neutral, with only the display-style headline pulling slightly tighter to feel crisp and browser-native.

## Layout
The layout is extremely centered and minimal, with one narrow content stack placed in a large field of whitespace. There is no visible dense grid; instead, vertical rhythm and generous page margins do the work. Spacing increments cluster around 12px, 20px, 24px, 28px, and 32px, creating a measured but not luxurious cadence.

Use tight internal padding for controls and cards, and keep section spacing modest so the interface remains compact and utilitarian. Containers should not stretch into decorative wide layouts; prefer a small max-width content column and center it within the viewport. The design should feel like a native system dialog or error page rather than a marketing layout.

## Elevation & Depth
The UI is intentionally flat. There are no shadows or layered depth cues; hierarchy comes from typography, spacing, and contrast instead of elevation. Borders are subtle and functional, mainly used to separate secondary actions and card boundaries without introducing softness.

When a surface needs to stand apart, use a thin neutral border and white background rather than shadow. Avoid gradients, glows, and layered overlays, since they would conflict with the browser-default clarity of the source.

## Shapes
The corner radius language is restrained and slightly rounded. Interactive elements use a 6px radius, with cards opening up to 8px for a gently softer container. The result is practical and familiar rather than playful.

Favor `rounded.md` for buttons and inputs, `rounded.lg` for cards, and `rounded.none` for link-like actions. Avoid pill shapes unless there is a strong semantic reason, because the source favors compact system geometry.

## Components
Buttons are the clearest component family in the screenshot. `button-primary` is a dark filled action with white text, 8px by 16px padding, 40px height, and a 6px radius; it should be the default emphasis for the main recovery action. `button-secondary` is a transparent or white-outline control with a subtle border, used for the lower-priority escape action. `button-link` should remain text-only and underline-driven when inline navigation is needed.

Buttons should feel compact and utility-first rather than promotional. Keep label text in regular weight, avoid all-caps treatment, and maintain a minimum 40px touch target. Hover and focus states should stay understated: slightly stronger contrast, clearer outline, or a tiny border change rather than motion-heavy effects.

Cards are simple white surfaces with a 1px neutral border, 8px radius, and 16px padding. Use them to frame grouped content without creating a sense of elevation. Inputs should mirror this language with white fill, 6px radius, and modest padding so they feel like native form fields. If lists, chips, or toggles appear in future screens, they should inherit the same quiet border-first logic and avoid decorative shadows or oversized chrome.

## Do's and Don'ts
- Do keep the interface sparse and centered, with ample whitespace around the core content.
- Do use strong typographic hierarchy to communicate meaning before relying on color or decoration.
- Do preserve the dark primary action and the white secondary action for clear decision making.
- Do use subtle borders instead of shadows to separate surfaces.
- Don't introduce heavy gradients, neumorphism, or elevated card stacks.
- Don't widen the layout into a marketing-style grid or add unnecessary navigation chrome.
- Don't overuse the orange accent; reserve it for rare emphasis so it stays meaningful.
- Don't round controls into pills or introduce playful visual language that breaks the browser-native tone.

You are helping manage hackathon compliance and submission logistics for MNEME at Monad Blitz Pune V2.

## HARD RULES — NON-NEGOTIABLE

**Team:**
- Max 3 members per team. Do not plan work that requires more.

**Originality:**
- MNEME must be built fresh during the event. No pre-written production code, no forked existing codebase beyond standard boilerplate/libraries.
- Pre-event work that is allowed: research, brainstorming, architecture planning, reading documentation, this scoping exercise.
- Code, contracts, and assets: written only during official Blitz hours.

**Innovation test:**
- Before building any feature, ask: "Is this a meaningful new solution or a clone?" If it's a clone without a Monad-specific twist or novel mechanic, don't build it.

## SUBMISSION CHECKLIST

**GitHub:**
- Fork `https://github.com/monad-developers/monad-blitz-pune` from the `main` branch
- Fork name = project name (MNEME)
- One-liner description set on fork
- All project code committed to the fork
- `README.md` must include:
  - Project name and one-liner
  - Problem statement
  - Solution description
  - Architecture overview
  - **Smart contract addresses on Monad Testnet** (required — list every deployed contract)
  - Setup and run instructions
  - Team members

**Deployment:**
- Frontend: deployed and live on Vercel (or equivalent public URL)
- Smart contracts: deployed on Monad Testnet (not Mainnet, not local)
- Project must be operational and demonstrable at submission time

**Portal submission:**
- Submit at `https://blitz.devnads.com/`
- GitHub URL: your fork URL
- Demo URL: your Vercel deployment URL
- Submissions can be updated until voting starts

## WALLET & TESTNET DETAILS

**MNEME Testnet Wallet:**
- Address: `0x8e11d906a07F037029409e21fa14A0B733F0B431`
- Network: Monad Testnet
- Use this address as the deployer for all smart contracts
- All contract deployments must originate from or be associated with this address
- Keep the private key secure — never commit it to the repository; use environment variables only

**Contract deployment checklist:**
- Deploy `VaultRegistry.sol` → record address → add to README
- Deploy `AttestationAggregator.sol` → record address → add to README
- If time: deploy `MemoryMarket.sol` → record address → add to README
- Verify each contract on Monad Testnet explorer after deployment
- Each contract's ABI should be committed to `/contracts/abi/` in the repo

**Environment variables (never commit):**
- `MONAD_TESTNET_RPC_URL` — Monad Testnet RPC endpoint
- `DEPLOYER_PRIVATE_KEY` — wallet private key (use `.env.local`, add to `.gitignore`)
- `VAULT_REGISTRY_ADDRESS` — deployed contract address
- `ATTESTATION_AGGREGATOR_ADDRESS` — deployed contract address

## THINGS TO WATCH DURING THE BUILD

- If Monad RPC is slow or congested during the event: implement the offline attestation queue immediately — memories stored, attestations retried, no data loss. Don't block the demo on chain confirmation.
- Code freeze is at 6:00 PM. Submission deadline is 6:15 PM. Allocate at least 30 minutes before code freeze for deployment and README updates.
- Peer voting determines winners. The demo must show Monad doing real work — have a live Monad explorer tab open showing attestation transactions from the session.
- The pitch window is short (5 minutes max based on prior Blitz formats). Lead with the problem, show the on-chain proof, let the explorer speak.

## WHAT DISQUALIFIES OR WEAKENS THE SUBMISSION

- Smart contracts deployed on a local chain or Ethereum — must be Monad Testnet
- No contract address in README
- Frontend not publicly accessible
- Code clearly written before the event (timestamps, git history)
- Direct clone of Mem0/Zep without meaningful differentiation
- Monad used only for a token transfer with no functional role in the product