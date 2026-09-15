# Submission package — Nimiq Mini Apps Competition, Cycle II

Submit at https://miniappscompetition.com/submit before **18 Sep 2026, 23:59 UTC**.

## Links
- Live app: https://nimstamp.vercel.app
- Open inside Nimiq Pay: https://nimpay.app/miniapps/open/nimstamp.vercel.app
- Source (MIT): https://github.com/big14way/nimstamp
- Live stats: https://nimstamp.vercel.app/stats
- Demo video: `docs/demo/nimstamp-demo.mp4` → upload to YouTube (public) and paste the link here: **TODO**
- Listing request: https://github.com/nimiq/awesome/pull/31

## Description (≤ 250 words) — 214 words

Small businesses want repeat customers, but loyalty programmes are built for chains: apps, POS integrations, printed cards that get lost. Nimiq's built-in rewards work at curated partner locations; NimStamp lets any merchant anywhere set up loyalty in 60 seconds.

NimStamp is a digital stamp card that lives inside Nimiq Pay. A merchant signs in with the wallet that receives their payments, fills one form, and gets a link and a printable QR table tent. Customers open the link, tap Pay, and earn a stamp automatically every time they pay in NIM. When the card is full they redeem with one tap and show the cashier a four-letter code.

It uses Nimiq Pay end to end: `sendBasicTransactionWithData` attaches a tagged memo so the server can match each payment on the Nimiq blockchain, `sign()` proves wallet ownership for merchant login and reward redemption, `requestDeviceIdentifier` limits cards per phone, and the language API switches the interface between English, Spanish, German and French. The server is the only authority: it verifies every payment and signature on chain and never holds funds.

Everything is public and verifiable. The stats page (nimstamp.vercel.app/stats) lists every business, stamp and redemption with links to nimiq.watch — **[N] stamps for [N] customers at [N] businesses** at the time of submission.

For coffee shops, barbers, market stalls and anyone else who takes NIM.

## Before submitting
- [ ] Replace the bracketed numbers in the description with the live figures from `/stats`.
- [ ] Upload the demo video to YouTube (public, captions on) and add the link above.
- [ ] Lead's NIM payout address ready.
- [ ] Team listed in README (lead: Godswill Idolor, @big14way).
- [ ] Promotion: Skool intro post, ≥ 3 stats posts, ≥ 2 Sip & Ship calls, X account ≥ 4 posts, forum post.
