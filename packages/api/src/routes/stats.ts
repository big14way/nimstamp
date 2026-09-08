import { Hono } from 'hono';
import { RpcClient } from '../chain/rpc';
import { q } from '../db/queries';
import type { Env } from '../env';
import { maskAddress } from '../lib/address';
import type { Vars } from '../lib/auth';

export const stats = new Hono<{ Bindings: Env; Variables: Vars }>();

stats.get('/stats', async (c) => {
  const db = c.env.DB;
  const count = async (sql: string) => (await db.prepare(sql).first<{ n: number }>())?.n ?? 0;
  const [merchants, customers, stamps, redemptions, recent] = await Promise.all([
    count("SELECT COUNT(*) AS n FROM merchants WHERE status = 'active'"),
    count('SELECT COUNT(DISTINCT address) AS n FROM customer_cards'),
    count('SELECT COUNT(*) AS n FROM stamps WHERE counted = 1'),
    count('SELECT COUNT(*) AS n FROM redemptions'),
    db
      .prepare(
        `SELECT * FROM (
           SELECT 'stamp' AS type, m.name AS merchant_name, cc.address AS address, s.tx_hash AS tx_hash, s.created_at AS at
             FROM stamps s JOIN cards c ON c.id = s.card_id JOIN merchants m ON m.id = c.merchant_id JOIN customer_cards cc ON cc.id = s.customer_card_id
             WHERE s.counted = 1
           UNION ALL
           SELECT 'redemption' AS type, m.name, cc.address, r.tx_hash, r.issued_at
             FROM redemptions r JOIN cards c ON c.id = r.card_id JOIN merchants m ON m.id = c.merchant_id JOIN customer_cards cc ON cc.id = r.customer_card_id
         ) ORDER BY at DESC LIMIT 50`,
      )
      .all<{ type: string; merchant_name: string; address: string; tx_hash: string | null; at: number }>(),
  ]);
  const merchantList = (await db.prepare("SELECT m.name, m.city, c.id AS card_id, m.created_at FROM merchants m JOIN cards c ON c.merchant_id = m.id WHERE m.status = 'active' ORDER BY m.created_at").all<{ name: string; city: string | null; card_id: string; created_at: number }>()).results;
  return c.json({
    merchants,
    customers,
    stamps,
    redemptions,
    merchantList: merchantList.map((m) => ({ name: m.name, city: m.city, cardId: m.card_id, createdAt: m.created_at })),
    recent: recent.results.map((r) => ({ type: r.type, merchantName: r.merchant_name, customer: maskAddress(r.address), txHash: r.tx_hash ?? undefined, at: r.at })),
  });
});

stats.get('/health', async (c) => {
  let rpc: 'ok' | 'down' = 'down';
  let height: number | null = null;
  try {
    height = await RpcClient.fromEnv(c.env).getBlockNumber();
    rpc = 'ok';
  } catch {
    rpc = 'down';
  }
  const last = await q.getMeta(c.env.DB, 'lastWatcherRun');
  const price = await q.price(c.env.DB, 'USD');
  const priceError = await q.getMeta(c.env.DB, 'lastPriceError');
  return c.json({ ok: true, rpc, height, lastWatcherRun: last ? Number(last) : null, priceFetchedAt: price?.fetched_at ?? null, priceError: priceError || null, network: c.env.NIMIQ_NETWORK ?? 'main' }, rpc === 'ok' ? 200 : 503);
});
