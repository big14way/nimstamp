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

/**
 * NIM/USD from the first source that answers. Cloudflare's shared egress IPs get rate-limited by
 * CoinGecko (429) and CoinPaprika's multi-quote endpoint is paid (402), so exchange tickers are the
 * reliable fallbacks. EUR comes from the primary when present, otherwise from the FX feed.
 */
type NimPrice = { usd: number; eur?: number; source: string };
const SOURCES: { name: string; fetch: (env: Env) => Promise<NimPrice> }[] = [
  {
    name: 'primary',
    fetch: async (env) => {
      const url = env.PRICE_SOURCE_URL ?? 'https://api.coingecko.com/api/v3/simple/price?ids=nimiq-2&vs_currencies=usd,eur';
      const json = (await getJson(url, env.PRICE_API_KEY || undefined)) as Record<string, { usd?: number; eur?: number }>;
      const p = json['nimiq-2'] ?? Object.values(json)[0];
      return { usd: Number(p?.usd), eur: Number(p?.eur) || undefined, source: 'primary' };
    },
  },
  {
    name: 'kucoin',
    fetch: async () => {
      const json = (await getJson('https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=NIM-USDT')) as { data?: { price?: string } };
      return { usd: Number(json.data?.price), source: 'kucoin' };
    },
  },
  {
    name: 'gateio',
    fetch: async () => {
      const json = (await getJson('https://api.gateio.ws/api/v4/spot/tickers?currency_pair=NIM_USDT')) as { last?: string }[];
      return { usd: Number(json[0]?.last), source: 'gateio' };
    },
  },
  {
    name: 'coinpaprika',
    fetch: async () => {
      const json = (await getJson('https://api.coinpaprika.com/v1/tickers/nim-nimiq')) as { quotes?: { USD?: { price?: number } } };
      return { usd: Number(json.quotes?.USD?.price), source: 'coinpaprika' };
    },
  },
];

async function fetchNimPrice(env: Env): Promise<NimPrice> {
  const errors: string[] = [];
  for (const s of SOURCES) {
    try {
      const p = await s.fetch(env);
      if (p.usd > 0) return p;
      errors.push(`${s.name}: invalid data`);
    } catch (e) {
      errors.push(`${s.name}: ${String(e).replace(/^Error: /, '')}`);
    }
  }
  throw new Error(`all price sources failed (${errors.join('; ')})`);
}

/** Fetch NIM/USD (+EUR) and USD→EUR/NGN from the FX source; store all three. */
export async function fetchPrices(env: Env): Promise<Record<Currency, number>> {
  const fxUrl = env.FX_SOURCE_URL ?? 'https://open.er-api.com/v6/latest/USD';
  const [{ usd, eur, source }, fxJson] = await Promise.all([fetchNimPrice(env), getJson(fxUrl)]);
  const rates = (fxJson as { rates?: { NGN?: number; EUR?: number } }).rates ?? {};
  const ngnRate = Number(rates.NGN);
  const eurRate = Number(rates.EUR);
  if (!(ngnRate > 0) || !(eurRate > 0)) throw new Error('fx source returned invalid data');

  const prices: Record<Currency, number> = { USD: usd, EUR: eur && eur > 0 ? eur : usd * eurRate, NGN: usd * ngnRate };
  const ts = now();
  await env.DB.batch(
    SUPPORTED_CURRENCIES.map((c) =>
      env.DB.prepare('INSERT INTO prices (currency, nim_price, fetched_at) VALUES (?,?,?) ON CONFLICT(currency) DO UPDATE SET nim_price = excluded.nim_price, fetched_at = excluded.fetched_at').bind(c, prices[c], ts),
    ),
  );
  console.log(`prices updated source=${source} usd=${usd}`);
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
