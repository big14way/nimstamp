# On-device checklist (run inside Nimiq Pay on iOS and Android)

These are the items from the spec's §15 acceptance tests that can only be verified on a real phone with real NIM.
Everything else (matching rules, watcher, redemption idempotency, caps, RPC-down behaviour, i18n) is covered by
`packages/api/test` and the Playwright flow used during development.

Open the app via `https://nimpay.app/miniapps/open/<web-domain>/c/<cardId>`.

| # | Test | What to look for | Result |
|---|------|------------------|--------|
| T1 | Fresh install → open card deeplink | Card renders ≤ 2 s; "Connect Nimiq Pay" button (no blank screen) | |
| T2 | Merchant setup on phone | Sign message dialog → card created → dashboard; table tent downloads/opens | PASS 14 Sep (Android, Nimiq Pay). Card "Cafe one" created; table tent PNG downloads. |
| T3 | Laptop login via QR | Laptop shows QR; phone signs at `/m/login?handoff=…`; laptop dashboard loads | PASS 15 Sep after fix 12a1e4e (laptop polling stopped once the QR was created). Laptop dashboard loads within 2 s of the phone signature. |
| T4 | Pay exactly the minimum | Native confirm shows memo `NS1:<card>:<nonce>`; stamp within 90 s | PASS 14 Sep after fix 9ccca89: Nimiq Pay paid from a different account than `listAccounts()[0]`; watcher now trusts the memo nonce. Stamp within ~60 s. |
| T5 | Pay 2× minimum (edit amount in wallet) | Exactly 1 stamp | PASS 15 Sep. 391 NIM (above minimum) → exactly 1 stamp. |
| T6 | Pay below minimum | No stamp; yellow "below the minimum" banner | |
| T7 | Cancel wallet dialog | "Payment cancelled — nothing was sent."; card intact; retry works | |
| T8 | Pay, kill app before polling finishes | Reopen card → stamp is there | |
| T9 | Manual claim after intent expired (>15 min) | Stamp granted (`source=manual_claim` in dashboard) | |
| T13 | Fill card → Redeem | Sign dialog → green code screen; stamps reset; dashboard confirm works | PASS 15 Sep. Sign dialog → code MYHJ; stamps reset to 0; laptop dashboard confirm works. |
| T15 | 4th card on same device for same merchant | DEVICE_LIMIT message | |
| T18 | Nimiq Pay language = Spanish | UI in Spanish | |
| V2 | `sendBasicTransactionWithData` return value | Console: was `txHash` a 64-hex hash? If not, set nothing — watcher matched by memo anyway | `sendBasicTransactionWithData` resolved; watcher matched by memo either way. |
| V2b | Memo encoding | In the dashboard activity, click the tx link: is `recipientData` the plain memo? If the wallet hex-encodes, set `VITE_MEMO_ENCODING=hex` is NOT needed (server decodes both) | Plain text. `recipientData` decodes to `NS1:2YKXPJHD:2P9P5P` — no hex mode needed. |
| V3 | Signature scheme | API log line `login verified scheme=…` tells which scheme Nimiq Pay uses; record it in VERIFIED.md | |
| V8 | Unlisted-app warning | Note the exact wording; ask in Skool how to get listed | Wording: "Open this mini app? You have not opened this address before. Read it carefully. Scammers can disguise fake sites with characters that look like normal letters." Buttons: OPEN ANYWAY / DON'T OPEN. Listing PR: nimiq/awesome#31. |
