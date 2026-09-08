import { Hono } from 'hono';
import { z } from 'zod';
import { RpcClient } from '../chain/rpc';
import { q, serialize, type RedemptionRow, type StampRow } from '../db/queries';
import { cardLinks, type Env } from '../env';
import { maskAddress } from '../lib/address';
import { requireSession, type Ctx, type Vars } from '../lib/auth';
import { ApiError } from '../lib/errors';
import { newCardId, newMerchantId } from '../lib/ids';
import { now } from '../lib/time';
import { parseBody } from '../lib/validate';

export const merchants = new Hono<{ Bindings: Env; Variables: Vars }>();

const cardFields = {
  title: z.string().trim().min(2).max(40),
  rewardText: z.string().trim().min(2).max(80),
  stampsRequired: z.number().int().min(2).max(20),
  minFiatAmount: z.number().positive().max(1_000_000_000),
  fiatCurrency: z.enum(['NGN', 'USD', 'EUR']),
  velocityMinutes: z.number().int().min(10).max(60).optional(),
};

const createSchema = z.object({
  name: z.string().trim().min(2).max(40),
  city: z.string().trim().max(40).optional(),
  card: z.object(cardFields),
});

merchants.post('/', async (c) => {
  const s = await requireSession(c);
  const body = await parseBody(c, createSchema);
  const db = c.env.DB;
  if (s.merchant_id || (await q.merchantByAddress(db, s.address))) throw new ApiError('MERCHANT_EXISTS');

  const merchantId = newMerchantId();
  const cardId = newCardId();
  const t = now();
  // Start the watcher at the current height so old history is never scanned.
  let height = 0;
  try {
    height = await RpcClient.fromEnv(c.env).getBlockNumber();
  } catch {
    /* watcher will start from 0; harmless since no intents exist yet */
  }
  await db.batch([
    db.prepare('INSERT INTO merchants (id, address, name, city, created_at, status) VALUES (?,?,?,?,?,?)').bind(merchantId, s.address, body.name, body.city ?? null, t, 'active'),
    db
      .prepare('INSERT INTO cards (id, merchant_id, title, reward_text, stamps_required, min_fiat_amount, fiat_currency, velocity_minutes, created_at) VALUES (?,?,?,?,?,?,?,?,?)')
      .bind(cardId, merchantId, body.card.title, body.card.rewardText, body.card.stampsRequired, body.card.minFiatAmount, body.card.fiatCurrency, body.card.velocityMinutes ?? 10, t),
    db.prepare('INSERT INTO watcher_state (merchant_id, last_seen_height, last_polled_at) VALUES (?,?,NULL)').bind(merchantId, height),
    db.prepare('UPDATE sessions SET merchant_id = ? WHERE address = ?').bind(merchantId, s.address),
  ]);
  const merchant = (await q.merchantById(db, merchantId))!;
  const card = (await q.cardById(db, cardId))!;
  return c.json({ merchant: serialize.merchant(merchant), card: serialize.card(card), ...cardLinks(c.env, cardId) }, 201);
});

async function loadMine(c: Ctx) {
  const s = await requireSession(c);
  const merchant = s.merchant_id ? await q.merchantById(c.env.DB, s.merchant_id) : await q.merchantByAddress(c.env.DB, s.address);
  const card = merchant ? await q.cardByMerchant(c.env.DB, merchant.id) : null;
  if (!merchant || !card) throw new ApiError('NO_MERCHANT', undefined, { address: s.address });
  return { merchant, card };
}

merchants.get('/me', async (c) => {
  const { merchant, card } = await loadMine(c);
  const db = c.env.DB;
  const [customers, stamps, redemptions, watcher] = await Promise.all([
    db.prepare('SELECT COUNT(*) AS n FROM customer_cards WHERE card_id = ?').bind(card.id).first<{ n: number }>(),
    db.prepare('SELECT COUNT(*) AS n FROM stamps WHERE card_id = ? AND counted = 1').bind(card.id).first<{ n: number }>(),
    db.prepare('SELECT COUNT(*) AS n FROM redemptions WHERE card_id = ?').bind(card.id).first<{ n: number }>(),
    q.watcherState(db, merchant.id),
  ]);
  return c.json({
    merchant: serialize.merchant(merchant),
    card: serialize.card(card),
    stats: { customers: customers?.n ?? 0, stamps: stamps?.n ?? 0, redemptions: redemptions?.n ?? 0 },
    watcher: watcher ? { lastPolledAt: watcher.last_polled_at, lastSeenHeight: watcher.last_seen_height, error: watcher.last_error } : null,
    ...cardLinks(c.env, card.id),
  });
});

merchants.patch('/me/card', async (c) => {
  const { card } = await loadMine(c);
  const body = await parseBody(c, z.object(cardFields).partial());
  const sets: string[] = [];
  const vals: unknown[] = [];
  const map: Record<string, string> = {
    title: 'title',
    rewardText: 'reward_text',
    stampsRequired: 'stamps_required',
    minFiatAmount: 'min_fiat_amount',
    fiatCurrency: 'fiat_currency',
    velocityMinutes: 'velocity_minutes',
  };
  for (const [k, col] of Object.entries(map)) {
    const v = (body as Record<string, unknown>)[k];
    if (v !== undefined) {
      sets.push(`${col} = ?`);
      vals.push(v);
    }
  }
  if (sets.length) {
    await c.env.DB.prepare(`UPDATE cards SET ${sets.join(', ')} WHERE id = ?`).bind(...vals, card.id).run();
  }
  return c.json({ card: serialize.card((await q.cardById(c.env.DB, card.id))!) });
});

merchants.get('/me/activity', async (c) => {
  const { card } = await loadMine(c);
  const limit = Math.min(200, Math.max(1, Number(c.req.query('limit') ?? 50) || 50));
  const db = c.env.DB;
  const stamps = (
    await db
      .prepare('SELECT s.*, cc.address AS customer_address FROM stamps s JOIN customer_cards cc ON cc.id = s.customer_card_id WHERE s.card_id = ? ORDER BY s.created_at DESC LIMIT ?')
      .bind(card.id, limit)
      .all<StampRow & { customer_address: string }>()
  ).results;
  const redemptions = (
    await db
      .prepare('SELECT r.*, cc.address AS customer_address FROM redemptions r JOIN customer_cards cc ON cc.id = r.customer_card_id WHERE r.card_id = ? ORDER BY r.issued_at DESC LIMIT ?')
      .bind(card.id, limit)
      .all<RedemptionRow & { customer_address: string }>()
  ).results;
  return c.json({
    stamps: stamps.map((s) => ({ ...serialize.stamp(s), customer: maskAddress(s.customer_address) })),
    redemptions: redemptions.map((r) => ({ ...serialize.redemption(r), customer: maskAddress(r.customer_address) })),
  });
});

merchants.post('/me/redemptions/:id/confirm', async (c) => {
  const { card } = await loadMine(c);
  const r = await q.redemptionById(c.env.DB, c.req.param('id'));
  if (!r || r.card_id !== card.id) throw new ApiError('NOT_FOUND');
  if (r.status === 'issued') {
    await c.env.DB.prepare("UPDATE redemptions SET status = 'confirmed', confirmed_at = ? WHERE id = ?").bind(now(), r.id).run();
  }
  return c.json({ redemption: serialize.redemption((await q.redemptionById(c.env.DB, r.id))!) });
});
