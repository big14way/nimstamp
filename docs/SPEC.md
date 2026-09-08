# NimStamp — Product & Technical Specification (MVP)

**Target:** Nimiq Mini Apps Competition, Cycle II — submissions close **18 September 2026, 23:59 UTC**
**Working name:** NimStamp (rename freely; keep the codename in code until the end)
**One-liner:** A self-serve loyalty stamp card that lives inside Nimiq Pay. Any merchant creates a card in 60 seconds; customers earn stamps automatically when they pay in NIM; rewards are redeemed with a wallet signature.
**Spec version:** 1.0 · 06 Sep 2026

---

## 0. How to use this document

1. Read §1 (scope) and §2 (competition constraints) completely before writing code.
2. **Do not skip §3 (Day-0 Verification Gate).** Four wallet-API details could not be confirmed from public docs and are marked `[VERIFY]`. Every `[VERIFY]` item is confined to one file (`packages/web/src/wallet/nimiqPayProvider.ts`) so that resolving it never changes the rest of the system.
3. Build in the order of §16 (schedule). The MVP is done when every item in §15 (acceptance tests) passes on a real phone inside Nimiq Pay.
4. Anything not listed in §1.3 "In scope" is out of scope until §15 passes.

---

## 1. Product definition

### 1.1 Problem
Small merchants want repeat customers but paper punch cards get lost and app-based loyalty programs cost money and need a POS integration. Crypto-paying customers currently get nothing for loyalty. Nimiq Pay has payments and a wallet but no self-serve loyalty tool for arbitrary merchants (Nimiq's own rewards exist only at curated partner locations).

### 1.2 Solution
- **Merchant** opens NimStamp inside Nimiq Pay (or on a laptop), creates a card: name, stamp threshold (e.g. "1 stamp per purchase of at least ₦1,000"), reward text ("10th coffee free"), stamps needed (e.g. 10).
- **Customer** opens the merchant's card link inside Nimiq Pay, taps **Pay**, pays the merchant in NIM through the wallet's native confirmation, and the stamp appears automatically within seconds — no QR fumbling, no cashier action.
- When the card is full, the customer taps **Redeem**, signs a one-time message, and the screen shows a verified 4-character code the cashier can trust.
- A public **/stats** page lists every merchant, stamp and redemption, each linked to its on-chain transaction, so the Community Council can verify real usage.

### 1.3 In scope (MVP)
| # | Feature | Notes |
|---|---------|-------|
| F1 | Role picker (Customer / Business) | First screen, remembered locally |
| F2 | Merchant onboarding & card creation | Wallet-signature login; 1 card per merchant in MVP |
| F3 | Card page for customers (via link/deeplink) | Shows merchant, progress, Pay + Redeem buttons |
| F4 | In-app NIM payment with tagged memo | Payment initiated from inside the mini app |
| F5 | Chain watcher → automatic stamp | Server confirms tx on-chain; idempotent |
| F6 | "I paid but got no stamp" recovery flow | Paste tx hash → server verifies → stamp |
| F7 | Redemption with wallet signature → cashier code | Idempotent, expiring |
| F8 | Merchant dashboard | Card link, QR/table-tent PDF, list of stamps/redemptions, manual redeem confirm |
| F9 | Public stats page | Verifiable numbers with tx links |
| F10 | Device-ID anti-abuse | Cap cards per device per merchant |
| F11 | Fiat-pegged thresholds (NGN, USD, EUR) | Price fetched server-side |
| F12 | i18n: EN, ES, DE, FR | Uses `window.nimiqPay.language` |
| F13 | Error/empty/loading states on every screen | Scored explicitly |

### 1.4 Out of scope (do not build before §15 passes)
Multi-card merchants, multi-location, referral bonuses, USDT payments, push notifications, analytics charts, merchant payouts by the platform, custom themes, admin panel, email.

### 1.5 Users
- **Customer:** anyone with Nimiq Pay installed and a few NIM.
- **Merchant:** a small business owner; may never have used crypto; must be onboarded in person by the builder for the competition (target: 3 real merchants).

### 1.6 Key design principles
1. **The server is the only authority.** The client never tells the server "I paid" or "I redeemed"; it only sends inputs that the server verifies (on-chain or by signature). This is the pattern that won 2nd and 3rd place in Cycle I.
2. **Rewards are merchant-funded.** NimStamp never pays out NIM. This removes treasury risk and makes stamp farming pointless.
3. **No camera, no QR scanning inside the mini app.** Payments are triggered through the wallet provider; sharing is by link/deeplink.
4. **Every user-facing failure has a message and a next action.**

---

## 2. Competition constraints (hard requirements)

Source: miniappscompetition.com/rules and /scoring (read 06 Sep 2026).

| Requirement | How NimStamp satisfies it |
|-------------|---------------------------|
| Built on the Nimiq Pay Mini Apps Framework | Uses `@nimiq/mini-app-sdk`; runs inside Nimiq Pay WebView |
| Must support USDT or NIM; NIM scores under integration | NIM only in MVP; payments, message signing, device identifier, language API all used |
| Public GitHub repo, MIT license | `LICENSE` = MIT; repo public from day 1 |
| No hardcoded secrets | All secrets in Cloudflare env vars; `.env.example` committed, `.env` gitignored |
| Fully functional on first try, no prototypes | §15 acceptance tests on real devices |
| Original work; no substantially similar copies | Original code; libraries attributed in `README.md` "Credits" |
| Data collection must be disclosed with consent | Privacy notice page (§13); device-ID request carries a reason string |
| No gambling / games of chance | N/A |
| Team ≤ 5, one lead, one submission | Lead handles submission and payout wallet |
| ≤ 250-word description; demo video optional but scored | §17 |
| Submissions go public at start of Week 3 for testing | App must be live and stable by **Mon 8 Sep** |

**Scoring weights to design against:** Functionality/usefulness 45 · Nimiq integration 25 · Real usage 15 · Design/UX 10 · Builder promotion 5.

---

## 3. Day-0 Verification Gate (mandatory, ≤ 4 hours)

Install Nimiq Pay (iOS **and** Android), fund a wallet with ~5 NIM, and open a throwaway page inside Nimiq Pay via `https://nimpay.app/miniapps/open/<your-dev-host>`. Confirm each item and record the answer in `docs/VERIFIED.md`.

| ID | What to verify | Where it matters | If it fails |
|----|----------------|------------------|-------------|
| V1 | `import { init } from '@nimiq/mini-app-sdk'; const nimiq = await init(); await nimiq.listAccounts()` returns the user's NIM address(es). **Confirmed in docs.** | Identity | — |
| V2 `[VERIFY]` | Exact method to **send a NIM payment with a data/memo field** from the provider (name, argument shape, whether value is in NIM or luna, whether it returns the tx hash). Docs page: nimiq.dev/mini-apps → Nimiq API reference. Other entrants (Tanda) confirm memo-tagged and zero-value transactions work from Nimiq Pay. | F4, F5, F7-fallback | If no memo field is supported: switch matching to **sender-address + amount + time-window** (§7.3, Plan B). |
| V3 `[VERIFY]` | Exact **message-signing** method (Tanda and Cinima call it `sign()`), its return shape (signature, public key), and the **prefix/hash scheme** the server must apply to verify it. | F2 login, F7 | Use **zero-value memo transaction** for both login and redemption (§9.3, Plan B). Same watcher verifies it. |
| V4 `[VERIFY]` | Max byte length of the transaction data field (believed 64 bytes). Keep memo ≤ 32 bytes regardless. | §7.2 | Shorten memo format |
| V5 `[VERIFY]` | A public **JSON-RPC endpoint** for Nimiq mainnet you can call from Cloudflare Workers, and the method that returns **transactions for an address** (Albatross RPC: `getTransactionsByAddress`) and **a transaction by hash** (`getTransactionByHash`). Note rate limits. | F5, F6 | Run your own node (Docker) on a small VPS and point `NIMIQ_RPC_URL` at it. |
| V6 | `requestDeviceIdentifier({ reason })` prompts once and returns a 64-char hex string. **Confirmed in docs.** | F10 | — |
| V7 | `window.nimiqPay.language` returns a 2-letter code. **Confirmed in docs.** | F12 | Fall back to `navigator.language` |
| V8 | Whether a deeplink to a URL not on Nimiq's mini-app list shows a warning, and how to get listed (ask in Skool on Day 0). | Onboarding copy | Add a one-line "this warning is normal" note on the share sheet |

Decision rule after the gate:
- V2 passes and V3 passes → build **Plan A** everywhere (memo payment + signatures).
- V2 passes, V3 fails → Plan A for payments, **Plan B** (zero-value tx) for login and redemption.
- V2 fails → Plan B matching (§7.3) for payments; expect more support tickets; document the limitation.

---

## 4. Architecture

```
┌──────────────────────────────┐        ┌──────────────────────────────┐
│  Nimiq Pay (native app)      │        │  Laptop browser (merchant)   │
│  ┌────────────────────────┐  │        │                              │
│  │  NimStamp web app      │  │        │  NimStamp web app            │
│  │  (WebView, Vite+React) │  │        │  (same bundle, no provider)  │
│  └───────────┬────────────┘  │        └──────────────┬───────────────┘
│   injected provider          │                       │
└──────────────┼───────────────┘                       │
               │ HTTPS JSON                            │
               ▼                                       ▼
        ┌──────────────────────────────────────────────────────┐
        │  API — Cloudflare Worker (Hono, TypeScript)          │
        │  • REST endpoints (§8)      • signature verify (§9)  │
        │  • chain watcher (cron)     • price fetch (cron)     │
        └───────┬──────────────────────────┬───────────────────┘
                │                          │
                ▼                          ▼
        ┌───────────────┐        ┌────────────────────┐
        │ Cloudflare D1 │        │ Nimiq JSON-RPC node │
        │ (SQLite)      │        │ (public or own)     │
        └───────────────┘        └────────────────────┘
```

### 4.1 Stack (fixed — do not substitute)
| Layer | Choice | Reason |
|-------|--------|--------|
| Frontend | Vite + React 18 + TypeScript + Tailwind CSS | Small bundle, fast in WebView, AI-tool friendly |
| Routing | `react-router-dom` v6 | Deep links need real routes |
| i18n | `i18next` + `react-i18next` | JSON dictionaries |
| Backend | Cloudflare Workers + Hono + TypeScript | Free tier, cron triggers, global |
| DB | Cloudflare D1 | Free, SQL, used by Cycle I winners |
| Chain access | Nimiq JSON-RPC over HTTPS (`fetch`) | No WASM in Worker needed |
| Signature verify | `@nimiq/core` (web/WASM build) in Worker, or `tweetnacl` with Nimiq's prefix scheme `[VERIFY V3]` | |
| Hosting | Cloudflare Pages (web) + Workers (api) | Same account, HTTPS by default |
| Repo | Single monorepo, pnpm workspaces | |

### 4.2 Repository layout
```
nimstamp/
  LICENSE                     MIT
  README.md                   description, screenshots, setup, credits
  .env.example
  docs/
    VERIFIED.md               Day-0 gate answers
    PRIVACY.md                privacy notice source
    STATS.md                  usage log for Skool posts
  packages/
    web/                      Vite React app
      src/
        wallet/
          types.ts            WalletProvider interface
          nimiqPayProvider.ts real provider (ALL [VERIFY] code lives here)
          mockProvider.ts     browser dev
          index.ts            picks provider
        api/client.ts         typed fetch wrapper
        i18n/{en,es,de,fr}.json
        pages/                RolePicker, MerchantSetup, MerchantDashboard,
                              Card, Redeem, Stats, Privacy, NotFound
        components/
    api/                      Cloudflare Worker
      src/
        index.ts              Hono app + cron handler
        routes/               merchants, cards, payments, redemptions, stats, auth
        chain/rpc.ts          RPC client
        chain/watcher.ts      polling + matching
        crypto/verify.ts      signature verification
        price/fetch.ts        NIM price
        db/schema.sql
        db/queries.ts
      wrangler.toml
```

---

## 5. Wallet provider adapter

All wallet interaction goes through this interface. **No other file may import `@nimiq/mini-app-sdk`.**

```ts
// packages/web/src/wallet/types.ts
export interface WalletProvider {
  /** true when running inside Nimiq Pay with a provider available */
  isAvailable(): boolean;
  /** primary NIM address in user-friendly format "NQxx xxxx ..." */
  getAddress(): Promise<string>;
  /** stable per-device pseudonymous id (64 hex chars) */
  getDeviceId(reason: string): Promise<string>;
  /** language code from Nimiq Pay, or null */
  getLanguage(): string | null;
  /**
   * Send a NIM payment with a memo. Returns the transaction hash (hex).
   * amountLuna: integer, 1 NIM = 100_000 luna.
   */
  sendPayment(args: { to: string; amountLuna: number; memo: string }): Promise<{ txHash: string }>;
  /**
   * Sign an arbitrary UTF-8 message. Returns signature + public key, hex.
   * Throws WalletError('unsupported') if the provider cannot sign (→ Plan B).
   */
  signMessage(message: string): Promise<{ signature: string; publicKey: string; address: string }>;
}

export class WalletError extends Error {
  constructor(public code: 'unavailable' | 'rejected' | 'unsupported' | 'network' | 'unknown', msg?: string) {
    super(msg ?? code);
  }
}
```

Rules:
- `nimiqPayProvider.ts` implements this with `init()`, `listAccounts()`, `requestDeviceIdentifier()`, `window.nimiqPay.language`, and the `[VERIFY V2/V3]` calls.
- Map user cancellation of the native dialog to `WalletError('rejected')` — the UI shows "Payment cancelled" and stays on the card, never a blank screen.
- `mockProvider.ts` returns a fixed address, fake tx hashes and fake signatures; enabled when `import.meta.env.VITE_WALLET=mock`. The API has a matching `DEMO_MODE=1` that accepts mock signatures **only on non-production deployments**.
- On a laptop (no provider), the merchant dashboard still works after login via the phone (§9.2).

---

## 6. Data model (D1 / SQLite)

```sql
-- packages/api/src/db/schema.sql
PRAGMA foreign_keys = ON;

CREATE TABLE merchants (
  id            TEXT PRIMARY KEY,           -- 8-char base32 (Crockford), e.g. "K7Q2M9XA"
  address       TEXT NOT NULL UNIQUE,       -- NIM address, normalized "NQ.." with spaces
  name          TEXT NOT NULL CHECK(length(name) BETWEEN 2 AND 40),
  city          TEXT,
  created_at    INTEGER NOT NULL,           -- unix seconds
  status        TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused'))
);

CREATE TABLE cards (                         -- 1 card per merchant in MVP
  id                  TEXT PRIMARY KEY,     -- 8-char base32
  merchant_id         TEXT NOT NULL UNIQUE REFERENCES merchants(id),
  title               TEXT NOT NULL,        -- "Coffee card"
  reward_text         TEXT NOT NULL,        -- "10th coffee free"
  stamps_required     INTEGER NOT NULL CHECK(stamps_required BETWEEN 2 AND 20),
  min_fiat_amount     REAL NOT NULL CHECK(min_fiat_amount > 0),   -- e.g. 1000
  fiat_currency       TEXT NOT NULL CHECK(fiat_currency IN ('NGN','USD','EUR')),
  created_at          INTEGER NOT NULL
);

CREATE TABLE customer_cards (                -- one per (card, customer address)
  id            TEXT PRIMARY KEY,
  card_id       TEXT NOT NULL REFERENCES cards(id),
  address       TEXT NOT NULL,              -- customer NIM address
  device_id     TEXT,                       -- 64 hex, may be NULL if user declined
  stamps        INTEGER NOT NULL DEFAULT 0, -- current, resets on redemption
  lifetime_stamps INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL,
  UNIQUE(card_id, address)
);
CREATE INDEX idx_cc_device ON customer_cards(card_id, device_id);

CREATE TABLE payment_intents (               -- created BEFORE the wallet dialog opens
  id               TEXT PRIMARY KEY,        -- nonce, 6-char base32, unique per card
  customer_card_id TEXT NOT NULL REFERENCES customer_cards(id),
  card_id          TEXT NOT NULL REFERENCES cards(id),
  memo             TEXT NOT NULL UNIQUE,    -- "NS1:<card_id>:<nonce>"
  expected_luna    INTEGER NOT NULL,        -- min amount at creation time
  nim_price_fiat   REAL NOT NULL,           -- price used
  created_at       INTEGER NOT NULL,
  expires_at       INTEGER NOT NULL,        -- created_at + 900 (15 min)
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK(status IN ('pending','matched','expired'))
);

CREATE TABLE stamps (                        -- one row per confirmed on-chain payment
  id               TEXT PRIMARY KEY,
  customer_card_id TEXT NOT NULL REFERENCES customer_cards(id),
  card_id          TEXT NOT NULL REFERENCES cards(id),
  tx_hash          TEXT NOT NULL UNIQUE,    -- idempotency key
  intent_id        TEXT REFERENCES payment_intents(id),
  amount_luna      INTEGER NOT NULL,
  fiat_amount      REAL NOT NULL,
  fiat_currency    TEXT NOT NULL,
  block_height     INTEGER NOT NULL,
  source           TEXT NOT NULL CHECK(source IN ('watcher','manual_claim')),
  created_at       INTEGER NOT NULL
);

CREATE TABLE redemptions (
  id               TEXT PRIMARY KEY,
  customer_card_id TEXT NOT NULL REFERENCES customer_cards(id),
  card_id          TEXT NOT NULL REFERENCES cards(id),
  code             TEXT NOT NULL,           -- 4 chars, shown to cashier
  message          TEXT NOT NULL,           -- exact signed message
  signature        TEXT,                    -- hex (Plan A)
  tx_hash          TEXT,                    -- (Plan B)
  status           TEXT NOT NULL DEFAULT 'issued'
                   CHECK(status IN ('issued','confirmed','expired')),
  issued_at        INTEGER NOT NULL,
  expires_at       INTEGER NOT NULL,        -- issued_at + 600 (10 min)
  confirmed_at     INTEGER
);

CREATE TABLE sessions (                      -- merchant login
  token        TEXT PRIMARY KEY,            -- 32 random bytes hex
  merchant_id  TEXT NOT NULL REFERENCES merchants(id),
  created_at   INTEGER NOT NULL,
  expires_at   INTEGER NOT NULL             -- +30 days
);

CREATE TABLE auth_challenges (
  nonce       TEXT PRIMARY KEY,
  address     TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL              -- +5 min
);

CREATE TABLE watcher_state (
  merchant_id      TEXT PRIMARY KEY REFERENCES merchants(id),
  last_seen_height INTEGER NOT NULL DEFAULT 0,
  last_polled_at   INTEGER
);

CREATE TABLE prices (
  currency   TEXT PRIMARY KEY,              -- 'USD','EUR','NGN'
  nim_price  REAL NOT NULL,                 -- fiat per 1 NIM
  fetched_at INTEGER NOT NULL
);
```

ID generation: `crypto.getRandomValues` → Crockford base32, no vowels, uppercase. Card and merchant IDs are 8 chars; nonces 6 chars; redemption codes 4 chars (alphabet `23456789ABCDEFGHJKMNPQRSTUVWXYZ`).

Address normalization: uppercase, strip spaces, validate `^NQ[0-9]{2}[0-9A-Z]{32}$`, then re-insert a space every 4 chars. Store and compare only the normalized form.

---

## 7. Payment & stamping (F4, F5, F6)

### 7.1 Flow (Plan A)
```
Customer taps Pay
 1. web  → POST /cards/:cardId/intents {address, deviceId}
 2. api  ← creates payment_intent: nonce, memo "NS1:<cardId>:<nonce>",
           expected_luna = ceil(min_fiat_amount / nim_price * 100000), expires 15 min
 3. web  → provider.sendPayment({to: merchant.address, amountLuna: expected_luna, memo})
 4. Nimiq Pay shows native confirm; user approves → txHash
 5. web  → POST /payments/notify {intentId, txHash}   (optional hint, speeds up matching)
 6. web  polls GET /customer-cards/:id every 3 s for up to 90 s
 7. api  watcher (cron every 1 min) + notify-triggered check:
         fetch tx by hash / merchant address history; if valid → insert stamp (UNIQUE tx_hash)
 8. web  sees stamps incremented → success animation
```
The customer may edit the amount upward in the wallet dialog (paying for a bigger order); anything **≥ expected_luna** earns exactly **one** stamp. Amounts below `expected_luna` earn nothing and the intent stays pending (user sees "Amount was below the minimum — ask the merchant").

### 7.2 Memo format
```
NS1:<cardId 8 chars>:<nonce 6 chars>       → 19 bytes ASCII
```
- `NS1` is the version tag. Reject memos with other prefixes silently.
- Parse with regex `^NS1:([0-9A-Z]{8}):([0-9A-Z]{6})$`.
- The memo is the single source of truth for matching in Plan A.

### 7.3 Matching rules (watcher)
A transaction is a **valid stamp** iff all of:
1. `recipient == merchant.address` (normalized).
2. Included in a block (`block_height` present); treat as final (Nimiq PoS finality is fast; do not wait for extra confirmations).
3. Plan A: memo parses and `payment_intents.memo` exists with `status='pending'`, `expires_at > tx time − 60 s`, and `intent.card_id == card`; the intent's `customer_card_id.address` **must equal** `tx.sender`.
   Plan B (no memo): `tx.sender` has a `customer_card` for this card, a pending intent exists for that customer card created ≤ 15 min before the tx, and `value ≥ intent.expected_luna`.
4. `value_luna ≥ intent.expected_luna`.
5. `tx_hash` not already in `stamps` (DB UNIQUE constraint; catch and ignore).

On match (single transaction, in one DB batch): insert `stamps` row, set intent `matched`, increment `customer_cards.stamps` and `lifetime_stamps`.

### 7.4 Watcher implementation
- Cron trigger: `* * * * *` (every minute). Also run `checkMerchant(merchantId)` immediately when `/payments/notify` is called.
- Per active merchant: `getTransactionsByAddress(address, limit=100)` `[VERIFY V5]`; filter `block_height > last_seen_height`; apply §7.3; update `watcher_state.last_seen_height = max(height seen)`.
- If RPC fails: log, leave `last_seen_height` untouched, retry next minute. Never advance the cursor on error.
- Timeout every RPC call at 8 s. Workers cron has limited CPU; cap merchants processed per run at 50 (irrelevant at MVP scale, but code it).

### 7.5 Manual claim (F6)
`POST /payments/claim {customerCardId, txHash}` → server fetches tx by hash `[VERIFY V5]`, applies §7.3 with the relaxation that the intent may be the **most recent pending or expired-within-24h** intent for that customer card, then stamps with `source='manual_claim'`. Rate-limit: 5 claims/hour per customer card. Error responses map to the messages in §12.

### 7.6 Expiry
Cron marks intents `expired` when `expires_at < now` and status is pending. Expired intents are still matchable by the manual-claim path for 24 h.

---

## 8. API specification

Base URL: `https://api.<domain>`. JSON only. All timestamps unix seconds. Errors: `{ "error": { "code": "STRING_CODE", "message": "human text" } }` with HTTP 4xx/5xx.

CORS: allow only the web origin(s) in `ALLOWED_ORIGINS`.

Rate limiting (per IP, Cloudflare KV or in-memory map with expiry): 60 req/min general, stricter limits noted per route.

### 8.1 Auth (merchant)
| Method & path | Body | Response | Notes |
|---|---|---|---|
| `POST /auth/challenge` | `{address}` | `{nonce, message}` | `message = "NimStamp login\nAddress: <addr>\nNonce: <nonce>\nExpires: <iso>"` |
| `POST /auth/verify` | `{address, nonce, signature, publicKey}` (Plan A) **or** `{address, nonce, txHash}` (Plan B) | `{token, merchant | null}` | Sets nothing server-side except session; token returned in body; web stores in `localStorage` (allowed — this is a normal web app, not an artifact) |
| `POST /auth/logout` | — | `204` | Bearer token |

### 8.2 Merchants & cards
| Method & path | Auth | Body | Response |
|---|---|---|---|
| `POST /merchants` | Bearer (address from session challenge) | `{name, city?, card:{title, rewardText, stampsRequired, minFiatAmount, fiatCurrency}}` | `{merchant, card, shareUrl, deepLink}` |
| `GET /merchants/me` | Bearer | — | `{merchant, card, stats:{customers, stamps, redemptions}}` |
| `PATCH /merchants/me/card` | Bearer | any subset of card fields | `{card}` — changes apply to future stamps only |
| `GET /merchants/me/activity?limit=50` | Bearer | — | `{stamps:[…], redemptions:[…]}` |
| `POST /merchants/me/redemptions/:id/confirm` | Bearer | — | `{redemption}` (status→confirmed). Optional: cashier tap. |
| `GET /cards/:cardId` | public | — | `{card, merchant:{id,name,city,address}}` — **never** returns other customers' data |

### 8.3 Customer
| Method & path | Body | Response |
|---|---|---|
| `POST /cards/:cardId/customer-cards` | `{address, deviceId?}` | `{customerCard}` — idempotent on (card, address). Applies §10 caps. |
| `GET /customer-cards/:id?address=` | — | `{customerCard, card, merchant, pendingIntent?}` — `address` must match, else 404 |
| `POST /cards/:cardId/intents` | `{customerCardId, address}` | `{intent:{id, memo, toAddress, amountLuna, amountNim, fiatAmount, fiatCurrency, expiresAt}}` — limit 10/hour per customer card |
| `POST /payments/notify` | `{intentId, txHash}` | `202` — triggers immediate check |
| `POST /payments/claim` | `{customerCardId, txHash}` | `{stamp}` or error |
| `POST /customer-cards/:id/redemptions` | `{address, signature, publicKey}` **or** `{address, txHash}` | `{redemption:{id, code, expiresAt}}` |
| `GET /redemptions/:id` | — | `{status, code?}` |

### 8.4 Public
| Method & path | Response |
|---|---|
| `GET /stats` | `{merchants, customers, stamps, redemptions, recent:[{type, merchantName, txHash?, at}]}` (last 50; addresses masked `NQ12 …  ABCD`) |
| `GET /health` | `{ok:true, rpc:'ok'|'down', lastWatcherRun}` |

---

## 9. Authentication & signatures

### 9.1 Message formats (exact strings; server builds them, client signs the server's string verbatim)
```
Login:
NimStamp login
Address: NQ.. ..
Nonce: <6 chars>
Expires: <ISO-8601 UTC>

Redemption:
NimStamp redeem
Card: <cardId>
Customer: <customerCardId>
Nonce: <6 chars>
Expires: <ISO-8601 UTC>
```

### 9.2 Plan A verification (server)
1. Look up challenge by nonce; check not expired, address matches.
2. Derive address from `publicKey`; must equal `address` (Nimiq address = Blake2b-256 hash of the public key, base32 with checksum — use `@nimiq/core` `PublicKey.toAddress()` rather than reimplementing).
3. Verify Ed25519 signature over the message using the exact prefix/hash scheme confirmed in `[VERIFY V3]`.
4. Delete the challenge (single use).

Merchant login on a laptop: dashboard shows a QR with `https://nimpay.app/miniapps/open/<web>/login?nonce=…`; the phone (inside Nimiq Pay) signs; the laptop polls `GET /auth/session/:nonce` until the token appears. (Simple, no WebSocket.)

### 9.3 Plan B (no signing available)
The client sends a **zero-value transaction** to the **merchant's own address** with memo `NSA:<nonce>` (login) or `NSR:<nonce>` (redeem). The watcher recognises these prefixes, matches nonce → challenge/redemption, and requires `tx.sender == address`. Slightly slower (seconds), equally secure, uses the exact same watcher.

### 9.4 Redemption rules (F7)
- Allowed only when `customer_cards.stamps ≥ card.stamps_required`.
- Server issues a redemption with a 4-char code and 10-minute expiry, **and immediately** decrements `stamps` by `stamps_required` in the same DB batch (prevents double redemption on refresh).
- Customer screen: full-screen green panel, merchant name, reward text, big code, countdown. Cashier reads the code; optionally taps "confirm" in the merchant dashboard (F8) to log it.
- Only one `issued` redemption per customer card at a time.

---

## 10. Anti-abuse rules (F10)

| Threat | Rule |
|---|---|
| Self-merchant farming | Rewards are merchant-issued vouchers; the platform pays nothing. Farming only costs the farmer real NIM paid to themselves; harmless. |
| Micro-payment farming | `min_fiat_amount` enforced server-side via `expected_luna`; ≥ 1 stamp requires ≥ minimum. |
| Many wallets, one phone | Max **3 customer cards per device per merchant** (`device_id`). If device ID was declined: max **1 customer card per merchant per IP per day** (store hashed IP in a KV with 24 h TTL). |
| Stamp velocity | Max **1 stamp per customer card per 10 minutes** (merchant can raise to 60). Extra payments in the window are recorded but earn 0 stamps; UI says so before paying. |
| Replay | tx_hash UNIQUE; nonces single-use; challenges expire 5 min; intents 15 min; redemptions 10 min. |
| Fake tx hash in claim | Server fetches from RPC and applies §7.3; never trusts client fields. |

---

## 11. Prices (F11)

- Cron every 10 min: fetch NIM price in USD and EUR from a public price API (CoinGecko `simple/price?ids=nimiq-2&vs_currencies=usd,eur`), and USD→NGN from a public FX source (e.g. open.er-api.com). Store in `prices`. `[VERIFY the CoinGecko id string]`
- `expected_luna = ceil(min_fiat_amount / nim_price_fiat * 100000)`; store the price used on the intent and stamp.
- If the price is older than 60 min, intents return `503 PRICE_STALE` and the UI shows "Prices are updating, try again in a minute." Never fall back to a hardcoded price.
- Display both: "≈ 1,000 NGN · 52.3 NIM".

---

## 12. UX specification

### 12.1 Screens
| Route | Screen | Must contain |
|---|---|---|
| `/` | Role picker | Logo, one sentence, two big buttons: **I'm a customer** / **I run a business**. Remember choice in localStorage; header link to switch. |
| `/c/:cardId` | Customer card | Merchant name & city; stamp grid (`stamps_required` circles, filled = earned); "1 stamp per purchase of ≥ ₦1,000"; **Pay** (primary); **Redeem** (enabled only when full); "Didn't get a stamp?" link; pending-intent banner "Waiting for confirmation… (≤ 90 s)". |
| `/c/:cardId/claim` | Manual claim | Textarea for tx hash; "Where do I find this?" hint (Nimiq Pay → History → tap payment → copy hash); submit; result. |
| `/c/:cardId/redeem/:id` | Redemption | Full-screen success panel with code + countdown; "Show this to the cashier". |
| `/m/setup` | Merchant setup | Step 1 login (sign in Nimiq Pay); Step 2 form: business name, city, card title, reward text, stamps required (slider 2–20, default 10), minimum purchase (number + currency select), preview of the card as customers will see it; **Create card**. |
| `/m` | Merchant dashboard | Share link + copy button + deeplink; **Download table tent (PDF/PNG)**; totals; activity list (stamps with tx links, redemptions with codes and confirm button); edit card. |
| `/stats` | Public stats | Totals + recent activity with masked addresses and tx links. |
| `/privacy` | Privacy notice | §13 text. |
| `*` | Not found | Friendly, link home. |

### 12.2 States every screen implements
Loading skeleton · Empty state · Error state with retry · Success state. No screen may render blank while awaiting the provider; show "Connecting to Nimiq Pay…" and after 5 s a hint "Open this link inside the Nimiq Pay app."

### 12.3 Error messages (user-facing, EN source; translate all)
| Code | Message | Next action shown |
|---|---|---|
| WALLET_UNAVAILABLE | "This page needs the Nimiq Pay app." | Button: Open in Nimiq Pay (deeplink) |
| WALLET_REJECTED | "Payment cancelled — nothing was sent." | Try again |
| PRICE_STALE | "Prices are updating. Try again in a minute." | Retry |
| INTENT_EXPIRED | "This payment request expired. Start a new one." | Pay again |
| AMOUNT_TOO_LOW | "That payment was below the minimum for a stamp." | Ask merchant / pay difference |
| TX_NOT_FOUND | "We can't find that transaction yet. Wait a minute and try again." | Retry |
| TX_WRONG_RECIPIENT | "That payment didn't go to this business." | — |
| ALREADY_STAMPED | "That payment already earned a stamp." | — |
| VELOCITY_LIMIT | "You earned a stamp less than 10 minutes ago. This payment won't earn another." | shown **before** paying |
| DEVICE_LIMIT | "This phone already has the maximum cards for this business." | — |
| NOT_ENOUGH_STAMPS | "Collect all stamps to redeem." | — |
| REDEMPTION_ACTIVE | "You already have a redemption code open." | Show code |
| RPC_DOWN | "Nimiq network check is temporarily unavailable. Your stamp will appear automatically once it's back." | — |
| SIGNATURE_INVALID | "Signature couldn't be verified. Please try again." | Retry |

### 12.4 Design rules
- Mobile-first, 390 px width baseline; thumb-reachable primary button fixed at bottom.
- One accent colour; Nimiq gold `#F6B221` may be used as accent but **do not** use the Nimiq logo/wordmark anywhere except a plain-text "Runs inside Nimiq Pay".
- Font: system stack. Max bundle: 250 kB gzipped total. No animation library; CSS transitions only.
- Stamp fill animation on success (300 ms), haptic-like scale bump.
- Table tent: A5 PNG generated client-side (canvas): business name, "Earn stamps when you pay with Nimiq Pay", QR of the `nimpay.app` deeplink, short URL.

### 12.5 i18n (F12)
- Detect: `provider.getLanguage()` → else `navigator.language` → else `en`. Supported: `en`, `es`, `de`, `fr`; unsupported → `en`.
- All strings in JSON dictionaries; no hardcoded UI text. Currency formatting via `Intl.NumberFormat`.

---

## 13. Security & privacy

- Secrets only in Worker env vars: `NIMIQ_RPC_URL`, `NIMIQ_RPC_AUTH` (if any), `PRICE_API_KEY` (if any), `SESSION_SECRET`. Commit `.env.example` with empty values.
- HTTPS only; HSTS; `Content-Security-Policy` allowing self + API origin only.
- Data collected: NIM addresses (public), device identifier (pseudonymous), merchant name/city, hashed IPs (24 h). No emails, no names of customers, no analytics SDKs.
- Privacy notice (`/privacy`) states the above, purpose (loyalty accounting and abuse prevention), retention (activity 12 months; hashed IPs 24 h), and contact. Link it from the role picker footer and from the device-ID request screen.
- Device-ID request reason string: `"Prevent duplicate loyalty cards on this phone"`.
- Input validation with `zod` on every route. Parameterised SQL only.
- Logs must never include signatures, tokens or full device IDs.

---

## 14. Environment & deployment

### 14.1 Variables
```
# packages/api (wrangler secrets)
NIMIQ_RPC_URL=              # [VERIFY V5]
NIMIQ_NETWORK=main
SESSION_SECRET=
ALLOWED_ORIGINS=https://<web-domain>
PRICE_SOURCE_URL=https://api.coingecko.com/api/v3/simple/price?ids=nimiq-2&vs_currencies=usd,eur
FX_SOURCE_URL=https://open.er-api.com/v6/latest/USD
DEMO_MODE=0                 # 1 only on preview deployments

# packages/web (.env)
VITE_API_BASE=https://api.<domain>
VITE_WALLET=nimiqpay        # or mock
VITE_APP_URL=https://<web-domain>
```

### 14.2 Deploy
- `pnpm -r build`; web → Cloudflare Pages (production branch `main`); api → `wrangler deploy` with cron `* * * * *` and D1 binding `DB`.
- Migrations: `wrangler d1 execute DB --file=src/db/schema.sql` once; later changes as numbered files in `db/migrations/`.
- Custom domain on both; confirm `GET /health` returns `rpc:'ok'`.
- Deeplinks: `nimiqpay://miniapp?url=<web-domain>/c/<cardId>` and `https://nimpay.app/miniapps/open/<web-domain>/c/<cardId>`. Use the HTTPS form on printed material.

---

## 15. Acceptance tests (MVP is done only when all pass on iOS **and** Android inside Nimiq Pay)

| # | Test | Pass condition |
|---|------|----------------|
| T1 | Fresh install → open deeplink to a card | Card renders in ≤ 2 s; provider connected; no warning-related blank screen |
| T2 | Merchant setup end-to-end on phone | Card created; share link works; table tent downloads |
| T3 | Merchant login on laptop via QR handoff | Dashboard loads with token |
| T4 | Customer pays exactly the minimum | Stamp appears within 90 s without any manual step |
| T5 | Customer pays 2× the minimum | Exactly 1 stamp |
| T6 | Customer pays below minimum | No stamp; AMOUNT_TOO_LOW shown via pending intent info |
| T7 | Cancel wallet dialog | WALLET_REJECTED message; card intact; can retry |
| T8 | Pay, then kill the app before polling finishes | Reopen card → stamp is there (watcher matched it) |
| T9 | Manual claim with a valid hash after an expired intent | Stamp granted, `source=manual_claim` |
| T10 | Manual claim with a hash to a different merchant | TX_WRONG_RECIPIENT |
| T11 | Same tx hash claimed twice | ALREADY_STAMPED; stamp count unchanged |
| T12 | Two payments within 10 min | Second earns 0 stamps; warning shown before paying |
| T13 | Fill the card, redeem | Code shown; stamps reset; dashboard shows redemption; confirm works |
| T14 | Refresh redemption page repeatedly | Same code, no second decrement |
| T15 | 4th card on same device for same merchant | DEVICE_LIMIT |
| T16 | RPC URL set to an invalid host | UI shows RPC_DOWN; watcher cursor not advanced; recovers when fixed |
| T17 | Stale price (simulate) | PRICE_STALE; no intent created |
| T18 | Language set to `es` in Nimiq Pay | UI in Spanish |
| T19 | Stats page | Numbers equal DB counts; every stamp links to a valid explorer URL |
| T20 | Repo audit | `git grep -i "secret\|apikey\|private"` shows nothing sensitive; LICENSE=MIT; README complete |
| T21 | Lighthouse mobile | Performance ≥ 85 on `/c/:id` |

---

## 16. Build schedule (12 days from Sat 06 Sep)

| Day | Date | Deliverable |
|---|---|---|
| 0 | Sat 06 | §3 gate complete, `docs/VERIFIED.md` filled, repo public with MIT, Skool intro post, ask V8 in Skool, merchant #1 verbal yes |
| 1 | Sun 07 | Monorepo scaffold, schema deployed, provider adapter (real + mock), role picker + card page skeleton |
| 2 | Mon 08 | Intents + payment + watcher + notify; T4/T5/T8 pass on one phone. **App must be live today (Week 3 public testing).** |
| 3 | Tue 09 | Merchant setup + login (Plan A or B) + dashboard; T2/T3 |
| 4 | Wed 10 | Redemption + codes + confirm; anti-abuse caps; T12–T15. Attend Sip & Ship (Sept 9 was Wed — check calendar; Cycle II calls: Aug 26, Sep 2, Sep 9, Sep 16) |
| 5 | Thu 11 | Manual claim, all error states, prices, stats page; T6/T7/T9–T11/T16/T17/T19 |
| 6 | Fri 12 | i18n, design polish, table tent, Lighthouse; T18/T21. Onboard merchant #1 in person |
| 7 | Sat 13 | Onboard merchants #2–3; seed 10–20 friends with NIM; first stats post in Skool |
| 8 | Sun 14 | Bug fixes from real use; second-device testing (iOS+Android); README screenshots |
| 9 | Mon 15 | Stats post #2; X account + 2 posts; fix list |
| 10 | Tue 16 | Sip & Ship #4 — demo live; record demo video (60–90 s) |
| 11 | Wed 17 | Final QA pass of §15; write 250-word description; stats post #3 |
| 12 | Thu 18 | Submit before **23:59 UTC**; keep app running |

Rule: if by end of Day 2 T4 does not pass on a real phone, stop and reassess (fallback: daily word game). Do not push past Day 2 without a working payment→stamp loop.

---

## 17. Submission package

1. **Repo** public, MIT, README with: what/who/how it uses Nimiq Pay, 5 screenshots, architecture diagram (this doc's §4), setup steps, credits (all libraries), privacy notice link, link to live app and deeplink.
2. **Description (≤ 250 words)** — structure: problem (2 sentences) → what it does (3) → how it uses Nimiq Pay: payments with memo, message signing, device identifier, language API (3) → real usage numbers with stats link (2) → who it's for (1). Include the sentence: "Nimiq's built-in rewards work at curated partner locations; NimStamp lets any merchant anywhere set up loyalty in 60 seconds."
3. **Demo video** 60–90 s, phone screen recording: customer flow first (open card → pay → stamp appears), then redemption, then merchant dashboard on laptop, end on the stats page. No music with copyright; captions.
4. **Promotion checklist:** Skool intro post (Day 0), ≥ 3 stats posts, attended ≥ 2 Sip & Ship calls, X account for the app with ≥ 4 posts, YouTube video public, one post in the Nimiq community forum.
5. **Payout:** lead's NIM address recorded in the dashboard; team members listed in README.

---

## 18. Open questions to resolve in Skool / with the Nimiq team (ask on Day 0)

1. How to get the app URL onto the Nimiq Pay mini-app list to avoid the "unknown app" warning (V8)?
2. Recommended public mainnet JSON-RPC endpoint for mini apps and its rate limit (V5)?
3. Confirm the provider's payment method supports a data/memo field and returns the tx hash (V2).
4. Confirm the signing method and the message prefix scheme for server-side verification (V3).
5. Preferred block explorer URL pattern for linking tx hashes (for §12 stats links).

---

## 19. Definition of Done

- All §15 tests pass on iOS and Android inside Nimiq Pay.
- ≥ 3 real merchants with created cards; ≥ 30 stamps from ≥ 15 distinct customer addresses; ≥ 5 redemptions — all visible on `/stats` with tx links.
- Submission package §17 complete and submitted before the deadline.
