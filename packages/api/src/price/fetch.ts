import type { Env } from '../env';
import { q } from '../db/queries';
import { ApiError } from '../lib/errors';
import { now } from '../lib/time';

export const PRICE_MAX_AGE = 3600; // §11: older than 60 min → PRICE_STALE
export const SUPPORTED_CURRENCIES = ['NGN', 'USD', 'EUR'] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

async function getJson(url: string, apiKey?: string): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const headers: Record<string, string> = { accept: 'application/json', 'user-agent': 'NimStamp/0.1 (+https://github.com/big14way/nimstamp)' };
    if (apiKey) headers['x-cg-demo-api-key'] = apiKey;
    const res = await fetch(url, { headers, signal: ctrl.signal });
    if (!res.ok) throw new Error(`http ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

/** Fetch NIM/USD, NIM/EUR from CoinGecko and USD→NGN from the FX source; store all three. */
export async function fetchPrices(env: Env): Promise<Record<Currency, number>> {
  const priceUrl = env.PRICE_SOURCE_URL ?? 'https://api.coingecko.com/api/v3/simple/price?ids=nimiq-2&vs_currencies=usd,eur';
  const fxUrl = env.FX_SOURCE_URL ?? 'https://open.er-api.com/v6/latest/USD';
  const [priceJson, fxJson] = await Promise.all([getJson(priceUrl, env.PRICE_API_KEY || undefined), getJson(fxUrl)]);

  const p = (priceJson as Record<string, { usd?: number; eur?: number }>)['nimiq-2'] ?? Object.values(priceJson as Record<string, { usd?: number; eur?: number }>)[0];
  const usd = Number(p?.usd);
  const eur = Number(p?.eur);
  const ngnRate = Number((fxJson as { rates?: { NGN?: number } }).rates?.NGN);
  if (!(usd > 0) || !(eur > 0) || !(ngnRate > 0)) throw new Error('price source returned invalid data');

  const prices: Record<Currency, number> = { USD: usd, EUR: eur, NGN: usd * ngnRate };
  const ts = now();
  await env.DB.batch(
    SUPPORTED_CURRENCIES.map((c) =>
      env.DB.prepare('INSERT INTO prices (currency, nim_price, fetched_at) VALUES (?,?,?) ON CONFLICT(currency) DO UPDATE SET nim_price = excluded.nim_price, fetched_at = excluded.fetched_at').bind(c, prices[c], ts),
    ),
  );
  return prices;
}

/** Fiat per 1 NIM, guaranteed fresh; refreshes inline once if stale, never falls back to a constant. */
export async function getFreshPrice(env: Env, currency: Currency): Promise<number> {
  const row = await q.price(env.DB, currency);
  if (row && row.fetched_at > now() - PRICE_MAX_AGE) return row.nim_price;
  try {
    const prices = await fetchPrices(env);
    return prices[currency];
  } catch (e) {
    console.log(`price refresh failed: ${String(e)}`);
    throw new ApiError('PRICE_STALE');
  }
}

export function lunaForFiat(fiatAmount: number, nimPriceFiat: number): number {
  return Math.ceil((fiatAmount / nimPriceFiat) * 100_000);
}
