# Day-0 Verification Gate — answers

Recorded 08 Sep 2026. Sources: `@nimiq/mini-app-sdk@0.1.0` type definitions and bundled source,
the official Nimiq provider reference (nimiq.dev/raw/mini-apps/api-reference/nimiq-provider.md),
the `nimiq/trust-web3-provider` `nimiq` branch, Nimiq Hub sign-message reference, and live calls
against the public mainnet RPC.

| ID | Result | Detail |
|----|--------|--------|
| V1 | **PASS** | `init()` resolves `window.nimiq` (`NimiqProvider`). `listAccounts()` → `string[]` of user-friendly addresses (or `{error:{type,message}}`; the provider resolves error envelopes instead of rejecting). |
| V2 | **PASS (Plan A)** | `nimiq.sendBasicTransactionWithData({ recipient, value, data, fee?, validityStartHeight? })`. `value` is in **Luna** (1 NIM = 100 000 Luna). `data` is documented as *"text message to attach"* (example `data: 'mic check'`). Official reference says it returns the **tx hash** as a string; one Cycle-I entrant reports a serialized tx instead, so `nimiqPayProvider.ts` accepts a 64-hex string as the hash and otherwise falls back to watcher matching by memo (the hash is only a hint). Memo encoding is switchable with `VITE_MEMO_ENCODING=text|hex`; the server decodes both text and hex-of-text from `recipientData`. |
| V3 | **PASS (Plan A)** | `nimiq.sign(message: string \| { message, isHex? })` → `{ publicKey, signature }` (hex strings; server also tolerates base64 / byte arrays). Prefix scheme: Nimiq wallets sign `sha256('\x16Nimiq Signed Message:\n' + byteLength + message)` (Hub `MSG_PREFIX`, Keyguard `Key.signMessage`). Because the Nimiq Pay native side is closed source, `crypto/verify.ts` also accepts the un-hashed prefixed bytes and the raw message bytes; whichever verifies is logged as `scheme`. Address is derived from the public key (Blake2b-256 → 20 bytes → Nimiq base32 + IBAN check) and must equal the claimed address. Plan B (`NSA:`/`NSR:` zero-value tx) is still implemented as a fallback route. |
| V4 | **PASS** | Albatross basic transactions with data are `BasicTransaction` extended format; data ≤ 64 bytes is safe. Our memo `NS1:<8>:<6>` is 19 bytes ASCII. |
| V5 | **PASS** | Public mainnet JSON-RPC: `https://rpc.nimiqwatch.com` (from nimiq/awesome). Responses are wrapped as `{ result: { data, metadata } }`. `getTransactionsByAddress` **requires 3 positional params** `[address, max, startAt|null]` (or a named-params object); `getTransactionByHash([hash])` returns the tx or an `Internal error: Transaction not found` error. Tx fields: `hash, blockNumber, timestamp (ms), confirmations, from, to, value (luna), fee, senderData, recipientData (hex of raw bytes), executionResult`. No documented rate limit; the watcher caps at 50 merchants/run with 8 s timeouts. Fallback: own node via `NIMIQ_RPC_URL`. |
| V6 | **PASS** | `requestDeviceIdentifier({ reason })` → 64-char hex, prompts once per origin; rejects when denied / outside Nimiq Pay. |
| V7 | **PASS** | `window.nimiqPay.language` (also `getHostLanguage()`), ISO 639-1, seeded before page scripts run. |
| V8 | **OPEN** | Ask in Skool how to get listed in the Nimiq Pay mini-app directory. Share sheet shows a one-line note that a warning for unlisted apps is normal. |
| Price id | **PASS** | CoinGecko id `nimiq-2` returns `{ "nimiq-2": { usd, eur } }`. `open.er-api.com/v6/latest/USD` returns `rates.NGN`. |
| Explorer | **PASS** | `https://nimiq.watch/#<txHash>` (configurable via `VITE_EXPLORER_TX_URL`). |

Decision: **Plan A everywhere** (memo payments + wallet signatures), with Plan B endpoints kept as a safety net.
Items still to confirm on a physical device inside Nimiq Pay are marked in `docs/DEVICE_CHECKLIST.md`.
