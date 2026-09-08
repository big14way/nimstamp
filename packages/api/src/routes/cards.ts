import { Hono } from 'hono';
import { z } from 'zod';
import { q, serialize } from '../db/queries';
import { type Env } from '../env';
import { normalizeAddress } from '../lib/address';
import { clientIp, hashIp, type Vars } from '../lib/auth';
import { ApiError } from '../lib/errors';
import { newCustomerCardId, newNonce } from '../lib/ids';
import { buildMemo } from '../lib/memo';
import { DAY, HOUR, MINUTE, now } from '../lib/time';
import { parseBody } from '../lib/validate';
import { getFreshPrice, lunaForFiat } from '../price/fetch';

export const cards = new Hono<{ Bindings: Env; Variables: Vars }>();

const addressSchema = z.string().refine((a) => {
  try {
    normalizeAddress(a);
    return true;
  } catch {
    return false;
  }
}, 'Invalid NIM address');

const MAX_CARDS_PER_DEVICE = 3;
const MAX_INTENTS_PER_HOUR = 10;

async function loadCard(env: Env, cardId: string) {
  const card = await q.cardById(env.DB, cardId.toUpperCase());
  const merchant = card ? await q.merchantById(env.DB, card.merchant_id) : null;
  if (!card || !merchant) throw new ApiError('NOT_FOUND', 'This card does not exist.');
  return { card, merchant };
}

/** Public card view — never includes other customers' data. */
cards.get('/cards/:cardId', async (c) => {
  const { card, merchant } = await loadCard(c.env, c.req.param('cardId'));
  let price: number | null = null;
  try {
    price = await getFreshPrice(c.env, card.fiat_currency);
  } catch {
    /* card still renders; Pay will surface PRICE_STALE */
  }
  return c.json({
    card: serialize.card(card),
    merchant: serialize.merchantPublic(merchant),
    price: price ? { nimPriceFiat: price, minLuna: lunaForFiat(card.min_fiat_amount, price) } : null,
  });
});

/** Idempotent on (card, address). Applies §10 device / IP caps for new rows. */
cards.post('/cards/:cardId/customer-cards', async (c) => {
  const { card } = await loadCard(c.env, c.req.param('cardId'));
  const body = await parseBody(c, z.object({ address: addressSchema, deviceId: z.string().regex(/^[0-9a-fA-F]{64}$/).optional() }));
  const addr = normalizeAddress(body.address);
  const db = c.env.DB;
  const existing = await q.customerCardByAddress(db, card.id, addr);
  if (existing) {
    if (body.deviceId && !existing.device_id) {
      await db.prepare('UPDATE customer_cards SET device_id = ? WHERE id = ?').bind(body.deviceId.toLowerCase(), existing.id).run();
    }
    return c.json({ customerCard: serialize.customerCard(existing), created: false });
  }

  if (body.deviceId) {
    const n = await q.countCustomerCardsByDevice(db, card.id, body.deviceId.toLowerCase());
    if (n >= MAX_CARDS_PER_DEVICE) throw new ApiError('DEVICE_LIMIT');
  } else {
    const key = `ipday:${card.id}:${hashIp(clientIp(c), c.env.SESSION_SECRET)}`;
    if ((await q.countRate(db, key, now() - DAY)) >= 1) throw new ApiError('DEVICE_LIMIT', 'Only one loyalty card per business per day can be created without a device identifier.');
    await q.addRate(db, key);
  }

  const id = newCustomerCardId();
  await db
    .prepare('INSERT INTO customer_cards (id, card_id, address, device_id, stamps, lifetime_stamps, created_at) VALUES (?,?,?,?,0,0,?)')
    .bind(id, card.id, addr, body.deviceId?.toLowerCase() ?? null, now())
    .run();
  return c.json({ customerCard: serialize.customerCard((await q.customerCardById(db, id))!), created: true }, 201);
});

/** Card state for one customer. `address` must match, else 404. */
cards.get('/customer-cards/:id', async (c) => {
  const db = c.env.DB;
  const address = c.req.query('address') ?? '';
  const cc = await q.customerCardById(db, c.req.param('id').toUpperCase());
  let addr: string | null = null;
  try {
    addr = normalizeAddress(address);
  } catch {
    addr = null;
  }
  if (!cc || !addr || cc.address !== addr) throw new ApiError('NOT_FOUND');
  const { card, merchant } = await loadCard(c.env, cc.card_id);
  const [pending, latest, active, price] = await Promise.all([
    q.latestPendingIntent(db, cc.id),
    db.prepare('SELECT * FROM payment_intents WHERE customer_card_id = ? ORDER BY created_at DESC LIMIT 1').bind(cc.id).first(),
    q.activeRedemption(db, cc.id),
    getFreshPrice(c.env, card.fiat_currency).catch(() => null),
  ]);
  const windowEnd = cc.last_stamp_at ? cc.last_stamp_at + card.velocity_minutes * MINUTE : null;
  return c.json({
    customerCard: serialize.customerCard(cc),
    card: serialize.card(card),
    merchant: serialize.merchantPublic(merchant),
    pendingIntent: pending ? serialize.intent(pending, merchant.address) : null,
    lastIntent: latest ? serialize.intent(latest as never, merchant.address) : null,
    activeRedemption: active ? serialize.redemption(active) : null,
    velocityBlockedUntil: windowEnd && windowEnd > now() ? windowEnd : null,
    price: price ? { nimPriceFiat: price, minLuna: lunaForFiat(card.min_fiat_amount, price) } : null,
  });
});

/** Create a payment intent BEFORE the wallet dialog opens (§7.1 step 1–2). */
cards.post('/cards/:cardId/intents', async (c) => {
  const { card, merchant } = await loadCard(c.env, c.req.param('cardId'));
  const body = await parseBody(c, z.object({ customerCardId: z.string().length(8), address: addressSchema }));
  const db = c.env.DB;
  const cc = await q.customerCardById(db, body.customerCardId.toUpperCase());
  if (!cc || cc.card_id !== card.id || cc.address !== normalizeAddress(body.address)) throw new ApiError('NOT_FOUND');
  if ((await q.intentsForCustomerSince(db, cc.id, now() - HOUR)) >= MAX_INTENTS_PER_HOUR) throw new ApiError('RATE_LIMITED', 'Too many payment requests this hour. Please wait a bit.');

  // Reuse a still-valid pending intent (refresh keeps the same memo, so a payment already in flight still matches).
  const pending = await q.latestPendingIntent(db, cc.id);
  if (pending && pending.expires_at > now() + 5 * MINUTE) {
    return c.json({ intent: serialize.intent(pending, merchant.address), reused: true });
  }

  const price = await getFreshPrice(c.env, card.fiat_currency); // throws PRICE_STALE
  const expectedLuna = lunaForFiat(card.min_fiat_amount, price);
  const t = now();
  for (let attempt = 0; attempt < 3; attempt++) {
    const nonce = newNonce();
    const memo = buildMemo(card.id, nonce);
    try {
      await db
        .prepare('INSERT INTO payment_intents (id, customer_card_id, card_id, memo, expected_luna, nim_price_fiat, fiat_amount, fiat_currency, created_at, expires_at, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
        .bind(nonce, cc.id, card.id, memo, expectedLuna, price, card.min_fiat_amount, card.fiat_currency, t, t + 15 * MINUTE, 'pending')
        .run();
      const intent = (await q.intentById(db, nonce))!;
      return c.json({ intent: serialize.intent(intent, merchant.address), reused: false, velocityBlockedUntil: cc.last_stamp_at && cc.last_stamp_at + card.velocity_minutes * MINUTE > t ? cc.last_stamp_at + card.velocity_minutes * MINUTE : null }, 201);
    } catch (e) {
      if (!/UNIQUE/i.test(String(e))) throw e;
    }
  }
  throw new ApiError('INTERNAL');
});
