# NimStamp privacy notice

NimStamp is a loyalty tool that runs inside Nimiq Pay. We collect the minimum needed to count stamps and prevent abuse. The live notice is served at `/privacy` in the app (EN, ES, DE, FR).

## What we store
- Your NIM address (public on the blockchain anyway) and the loyalty cards linked to it.
- A pseudonymous device identifier provided by Nimiq Pay (a SHA-256 hash scoped to this app's origin), only if you accept the prompt. Reason shown in the prompt: *"Prevent duplicate loyalty cards on this phone"*. Used to cap cards per device per business (max 3).
- Business name and city entered by merchants.
- A hashed IP address for 24 hours when no device identifier is available, to limit card creation (1 per business per day).
- Transaction hashes, amounts and timestamps of payments that earned stamps, and redemption codes.

## What we don't collect
No emails, phone numbers or customer names. No analytics SDKs, no advertising trackers, no cookies.

## Why
Loyalty accounting (counting stamps and rewards) and abuse prevention (duplicate cards, replayed payments).

## Retention
Activity records: 12 months. Hashed IPs: 24 hours. Sign-in sessions: 30 days. Sign-in challenges: 5 minutes. Payment intents: matched or expired after 15 minutes (claimable for 24 h).

## Contact
Questions or deletion requests: open an issue at https://github.com/big14way/nimstamp/issues.
