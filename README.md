# NimStamp

Self-serve loyalty stamp cards that live inside [Nimiq Pay](https://nimiq.com/nimiq-pay).
Any merchant creates a card in 60 seconds; customers earn stamps automatically when they pay in NIM;
rewards are redeemed with a wallet signature.

Built for the Nimiq Mini Apps Competition, Cycle II. MIT licensed.

> Work in progress — see `docs/SPEC.md` for the full specification and `docs/VERIFIED.md` for the Day-0 wallet API verification.

## Layout

```
packages/web   Vite + React + Tailwind mini app (runs inside Nimiq Pay and in a normal browser)
packages/api   Cloudflare Worker (Hono) + D1: REST API, chain watcher, price cron
docs/          spec, verification gate, privacy notice, usage stats
```
