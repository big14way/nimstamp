# Product

NimStamp — a self-serve loyalty stamp card that lives inside Nimiq Pay. Any merchant creates a card in about a minute; customers earn a stamp automatically when they pay the merchant in NIM; rewards are redeemed with a wallet signature and a 4-character code the cashier trusts.

## Platform

web (mobile-first WebView inside the Nimiq Pay app on iOS and Android; the merchant dashboard is also used in a laptop browser)

## Stack

Vite + React 18 + TypeScript + Tailwind CSS 4 (web, `packages/web`); Cloudflare Worker + D1 API (`packages/api`). Deployed on Vercel (web) and Cloudflare Workers (API). System font stack; no animation library; bundle budget 250 kB gzipped.

## Users

- **Customer:** anyone with Nimiq Pay installed and a few NIM. Opens a merchant's card link at the counter, taps Pay, confirms in the wallet, watches the stamp land. Later redeems a full card by showing a code to the cashier.
- **Merchant:** a small-business owner, often first-time crypto user, onboarded in person. Creates one card (name, city, title, reward, stamps needed, minimum purchase in NGN/USD/EUR), shares the link or prints the table tent, glances at the dashboard to confirm a redemption code.
- **Cashier:** reads a 4-character code off the customer's phone across a counter; may tap Confirm in the merchant dashboard.
- **Community Council / judges:** verify real usage on the public stats page, where every stamp links to its on-chain transaction.

## Product Purpose

Replace paper punch cards and paid loyalty apps for merchants who accept NIM. The job: reward repeat customers with zero POS integration and zero cashier effort. Success = a merchant sets up in 60 seconds, a customer's stamp appears within 90 seconds of paying, and a redemption is trusted at the counter.

## Positioning

Nimiq's built-in rewards work at curated partner locations; NimStamp lets any merchant anywhere set up loyalty in 60 seconds. Entry for the Nimiq Mini Apps Competition, Cycle II (submissions close 18 Sep 2026). Scoring weights: functionality 45, Nimiq integration 25, real usage 15, design 10, promotion 5.

## Operating Context

Primary scene (confirmed by the owner): Lagos small shops — cafés, kiosks, salons. Bright daylight, mid/low-end Android phones, spotty data, the customer's screen shown to a cashier across a counter. Sessions are short (under a minute) and one-handed with the thumb. The merchant dashboard is used standing at the counter on a phone or occasionally on a laptop. Secondary: European cafés on iPhone.

## Capabilities and Constraints

- Wallet actions go through Nimiq Pay's injected provider: list accounts, pay with a memo-tagged transaction, sign a message, request a device identifier, read the host language. Each wallet action opens a native dialog; the app must never fire one without a tap.
- The server is the only authority: it confirms payments on-chain and issues redemption codes. The UI reflects server state; it never asserts "paid".
- Every screen needs loading, empty, error (with a next action), and success states. Message strings are fixed by the spec (`docs/SPEC.md` §12.3) and exist in EN, ES, DE, FR; all UI text is in i18n dictionaries.
- Primary action is thumb-reachable and fixed at the bottom on phone widths (390 px baseline).
- Redemption screen must be readable by a cashier from across a counter: merchant name, reward, a very large code, a countdown.
- Table tent: A5 PNG generated client-side with a QR code.
- No Nimiq logo or wordmark; the plain-text line "Runs inside Nimiq Pay" is allowed. Nimiq gold `#F6B221` may be used as an accent but is not required.
- Brand: the owner has released the current look (gold + navy, circle stamp mark) for full redesign; only the name NimStamp is fixed. No landing page in scope; product screens only.
- Terminology: stamp, card, reward, redeem, code, merchant/business, customer, Nimiq Pay, NIM, Luna (1 NIM = 100 000 Luna).
- Accessibility: touch targets ≥ 44 px, contrast ≥ 4.5:1 for body text, works with browser zoom; language follows the Nimiq Pay setting.
- Evidence: live usage counters and per-stamp transaction links on `/stats`; nothing else may be claimed (no customer counts, prices, or testimonials).
