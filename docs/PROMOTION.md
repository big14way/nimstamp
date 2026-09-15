# Promotion posts — ready to paste

Live numbers on 15 Sep 2026: 1 business · 1 customer · 6 stamps · 2 redemptions. Update from https://nimstamp.vercel.app/stats before each post.

Links: app https://nimstamp.vercel.app · inside Nimiq Pay https://nimpay.app/miniapps/open/nimstamp.vercel.app · video https://youtu.be/_u_yXShSigw · source https://github.com/big14way/nimstamp · stats https://nimstamp.vercel.app/stats

---

## 1. Skool — intro post

**Title:** NimStamp: loyalty stamp cards for any merchant, inside Nimiq Pay

Hi everyone, I'm Godswill, building NimStamp for Cycle II.

**The problem.** Small businesses live on repeat customers, but loyalty tools were never built for them. Paper punch cards get lost, loyalty apps cost money and need a POS, and customers who pay in crypto get nothing back.

**What NimStamp does.** A merchant signs in with the wallet that receives their payments, fills one form, and gets a link plus a printable QR table tent. Customers open the link inside Nimiq Pay, tap Pay, and a stamp appears automatically once the payment is confirmed on chain. When the card is full they redeem with a wallet signature and show the cashier a 4-letter code.

**How it uses Nimiq Pay.** `sendBasicTransactionWithData` with a tagged memo, `sign()` for merchant login and redemption, `requestDeviceIdentifier` against duplicate cards, and the language API (EN/ES/DE/FR). The server verifies everything on chain and never holds funds.

Nimiq's built-in rewards work at curated partner locations; NimStamp lets any merchant anywhere set up loyalty in 60 seconds.

Try it: https://nimpay.app/miniapps/open/nimstamp.vercel.app
90-second demo: https://youtu.be/_u_yXShSigw
Source (MIT): https://github.com/big14way/nimstamp
Live stats: https://nimstamp.vercel.app/stats

Two things I'd love from you: try the customer flow with a few NIM (stamps cost ~390 NIM and go to the merchant wallet), and tell me what breaks. I've got a merchant in Lagos on it already and I'm onboarding more this week.

---

## 2. Skool — stats post #1 (post today)

**Title:** NimStamp week 3 update: first real stamps on chain

First real usage is live. Every number below links to a Nimiq transaction on the stats page.

- Businesses: 1 (Cafe one, Lagos)
- Customers: 1
- Stamps: 6
- Redemptions: 2

What I fixed from real-phone testing this week: Nimiq Pay can pay from a different account than `listAccounts()` returns first, so the watcher now trusts the memo nonce instead of the sender address. Laptop QR sign-in also had a polling bug that only showed up on a real device. Both shipped.

Next: onboarding two more merchants and seeding friends with NIM. If you want a card for your own business, reply and I'll set it up with you.

Stats: https://nimstamp.vercel.app/stats · Try it: https://nimpay.app/miniapps/open/nimstamp.vercel.app

---

## 3. Skool — stats post #2 (Tue 16 or Wed 17, after seeding friends)

**Title:** NimStamp update: [N] stamps from [N] customers

Numbers since Monday: [N] businesses, [N] customers, [N] stamps, [N] redemptions. All on chain: https://nimstamp.vercel.app/stats

What I learned onboarding people: [one sentence about what confused a customer or merchant and what you changed].

Demo video is up: https://youtu.be/_u_yXShSigw

---

## 4. Skool — stats post #3 (Thu 18, before submitting)

**Title:** NimStamp final numbers + submission

Submitting today. Final on-chain numbers: [N] businesses, [N] customers, [N] stamps, [N] redemptions. https://nimstamp.vercel.app/stats

Thanks to everyone who tested. If you run a business that takes NIM, the card is free: https://nimstamp.vercel.app

---

## 5. X — 4 posts (account @NimStampApp or your own)

**Post 1 (launch)**
Loyalty stamp cards for any business that takes NIM, inside Nimiq Pay. Pay → stamp appears on chain. Full card → redeem with a wallet signature. Built for the @nimiq Mini Apps Competition.
Try it: nimstamp.vercel.app
Demo: https://youtu.be/_u_yXShSigw

**Post 2 (how it works)**
No QR scanning, no cashier action. NimStamp tags each NIM payment with a memo, watches the Nimiq blockchain, and drops the stamp on the customer's card within seconds. Every stamp links to its transaction. nimstamp.vercel.app/stats

**Post 3 (merchant angle)**
Merchants: one form, 60 seconds, free. Sign in by scanning a QR with the phone that receives your payments. Print the table tent, done. No POS, no monthly fee. nimstamp.vercel.app

**Post 4 (numbers, Thursday)**
NimStamp after week 3: [N] businesses, [N] customers, [N] stamps, [N] rewards redeemed, all verifiable on chain. Submitted to the @nimiq Mini Apps Competition Cycle II today. nimstamp.vercel.app/stats

---

## 6. Nimiq community forum post

**Title:** NimStamp — self-serve loyalty stamp cards inside Nimiq Pay (Mini Apps Cycle II)

Hi all, sharing my Cycle II entry.

NimStamp lets any merchant create a loyalty stamp card in about a minute. Customers earn a stamp automatically every time they pay the merchant in NIM through Nimiq Pay; the server matches the memo-tagged transaction on chain. Rewards are redeemed with a wallet signature and a short code for the cashier. Merchants sign in by scanning a QR with their phone, so there are no passwords or accounts.

Everything is public: https://nimstamp.vercel.app/stats lists every stamp and redemption with a nimiq.watch link.

- Open in Nimiq Pay: https://nimpay.app/miniapps/open/nimstamp.vercel.app
- Demo: https://youtu.be/_u_yXShSigw
- Source, MIT: https://github.com/big14way/nimstamp

Feedback welcome, especially from anyone running a shop that takes NIM.

---

## 7. Competition form — miniappscompetition.com/submit

Use the description in `docs/SUBMISSION.md` with the numbers replaced. Have ready: lead name, email, NIM payout address, app URL, repo URL, video URL, team (Godswill Idolor, @big14way).
