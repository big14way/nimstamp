import { now } from '../lib/time';

export interface MerchantRow {
  id: string;
  address: string;
  name: string;
  city: string | null;
  created_at: number;
  status: 'active' | 'paused';
}
export interface CardRow {
  id: string;
  merchant_id: string;
  title: string;
  reward_text: string;
  stamps_required: number;
  min_fiat_amount: number;
  fiat_currency: 'NGN' | 'USD' | 'EUR';
  velocity_minutes: number;
  created_at: number;
}
export interface CustomerCardRow {
  id: string;
  card_id: string;
  address: string;
  device_id: string | null;
  stamps: number;
  lifetime_stamps: number;
  last_stamp_at: number | null;
  created_at: number;
}
export interface IntentRow {
  id: string;
  customer_card_id: string;
  card_id: string;
  memo: string;
  expected_luna: number;
  nim_price_fiat: number;
  fiat_amount: number;
  fiat_currency: string;
  created_at: number;
  expires_at: number;
  status: 'pending' | 'matched' | 'expired';
  last_error: string | null;
}
export interface StampRow {
  id: string;
  customer_card_id: string;
  card_id: string;
  tx_hash: string;
  intent_id: string | null;
  amount_luna: number;
  fiat_amount: number;
  fiat_currency: string;
  block_height: number;
  source: 'watcher' | 'manual_claim';
  counted: number;
  created_at: number;
}
export interface RedemptionRow {
  id: string;
  customer_card_id: string;
  card_id: string;
  code: string;
  message: string;
  signature: string | null;
  tx_hash: string | null;
  status: 'issued' | 'confirmed' | 'expired';
  issued_at: number;
  expires_at: number;
  confirmed_at: number | null;
}
export interface SessionRow {
  token: string;
  merchant_id: string | null;
  address: string;
  created_at: number;
  expires_at: number;
}
export interface ChallengeRow {
  nonce: string;
  purpose: 'login' | 'redeem';
  address: string;
  subject: string | null;
  message: string;
  created_at: number;
  expires_at: number;
}
export interface WatcherStateRow {
  merchant_id: string;
  last_seen_height: number;
  last_polled_at: number | null;
  last_error: string | null;
}
export interface PriceRow {
  currency: string;
  nim_price: number;
  fetched_at: number;
}

const first = async <T>(stmt: D1PreparedStatement) => (await stmt.first<T>()) ?? null;
const all = async <T>(stmt: D1PreparedStatement) => (await stmt.all<T>()).results;

export const q = {
  // ---- merchants & cards
  merchantById: (db: D1Database, id: string) =>
    first<MerchantRow>(db.prepare('SELECT * FROM merchants WHERE id = ?').bind(id)),
  merchantByAddress: (db: D1Database, address: string) =>
    first<MerchantRow>(db.prepare('SELECT * FROM merchants WHERE address = ?').bind(address)),
  activeMerchants: (db: D1Database, limit: number) =>
    all<MerchantRow>(db.prepare("SELECT * FROM merchants WHERE status = 'active' ORDER BY created_at LIMIT ?").bind(limit)),
  cardById: (db: D1Database, id: string) => first<CardRow>(db.prepare('SELECT * FROM cards WHERE id = ?').bind(id)),
  cardByMerchant: (db: D1Database, merchantId: string) =>
    first<CardRow>(db.prepare('SELECT * FROM cards WHERE merchant_id = ?').bind(merchantId)),

  // ---- customer cards
  customerCardById: (db: D1Database, id: string) =>
    first<CustomerCardRow>(db.prepare('SELECT * FROM customer_cards WHERE id = ?').bind(id)),
  customerCardByAddress: (db: D1Database, cardId: string, address: string) =>
    first<CustomerCardRow>(db.prepare('SELECT * FROM customer_cards WHERE card_id = ? AND address = ?').bind(cardId, address)),
  countCustomerCardsByDevice: async (db: D1Database, cardId: string, deviceId: string) =>
    (await first<{ n: number }>(
      db.prepare('SELECT COUNT(*) AS n FROM customer_cards WHERE card_id = ? AND device_id = ?').bind(cardId, deviceId),
    ))?.n ?? 0,

  // ---- intents
  intentById: (db: D1Database, id: string) => first<IntentRow>(db.prepare('SELECT * FROM payment_intents WHERE id = ?').bind(id)),
  intentByMemo: (db: D1Database, memo: string) =>
    first<IntentRow>(db.prepare('SELECT * FROM payment_intents WHERE memo = ?').bind(memo)),
  latestPendingIntent: (db: D1Database, customerCardId: string) =>
    first<IntentRow>(
      db
        .prepare("SELECT * FROM payment_intents WHERE customer_card_id = ? AND status = 'pending' AND expires_at > ? ORDER BY created_at DESC LIMIT 1")
        .bind(customerCardId, now()),
    ),
  /** Most recent pending or expired-within-24h intent (manual claim relaxation). */
  latestClaimableIntent: (db: D1Database, customerCardId: string) =>
    first<IntentRow>(
      db
        .prepare("SELECT * FROM payment_intents WHERE customer_card_id = ? AND status IN ('pending','expired') AND created_at > ? ORDER BY created_at DESC LIMIT 1")
        .bind(customerCardId, now() - 86400),
    ),
  intentsForCustomerSince: async (db: D1Database, customerCardId: string, since: number) =>
    (await first<{ n: number }>(
      db.prepare('SELECT COUNT(*) AS n FROM payment_intents WHERE customer_card_id = ? AND created_at > ?').bind(customerCardId, since),
    ))?.n ?? 0,
  expireIntents: (db: D1Database) =>
    db.prepare("UPDATE payment_intents SET status = 'expired' WHERE status = 'pending' AND expires_at < ?").bind(now()).run(),

  // ---- stamps
  stampByTx: (db: D1Database, txHash: string) => first<StampRow>(db.prepare('SELECT * FROM stamps WHERE tx_hash = ?').bind(txHash)),

  // ---- redemptions
  redemptionById: (db: D1Database, id: string) =>
    first<RedemptionRow>(db.prepare('SELECT * FROM redemptions WHERE id = ?').bind(id)),
  activeRedemption: (db: D1Database, customerCardId: string) =>
    first<RedemptionRow>(
      db
        .prepare("SELECT * FROM redemptions WHERE customer_card_id = ? AND status = 'issued' AND expires_at > ? ORDER BY issued_at DESC LIMIT 1")
        .bind(customerCardId, now()),
    ),
  expireRedemptions: (db: D1Database) =>
    db.prepare("UPDATE redemptions SET status = 'expired' WHERE status = 'issued' AND expires_at < ?").bind(now()).run(),

  // ---- auth
  sessionByToken: (db: D1Database, tokenHash: string) =>
    first<SessionRow>(db.prepare('SELECT * FROM sessions WHERE token = ? AND expires_at > ?').bind(tokenHash, now())),
  challenge: (db: D1Database, nonce: string) =>
    first<ChallengeRow>(db.prepare('SELECT * FROM auth_challenges WHERE nonce = ?').bind(nonce)),
  deleteChallenge: (db: D1Database, nonce: string) => db.prepare('DELETE FROM auth_challenges WHERE nonce = ?').bind(nonce).run(),

  // ---- watcher
  watcherState: (db: D1Database, merchantId: string) =>
    first<WatcherStateRow>(db.prepare('SELECT * FROM watcher_state WHERE merchant_id = ?').bind(merchantId)),

  // ---- prices
  price: (db: D1Database, currency: string) =>
    first<PriceRow>(db.prepare('SELECT * FROM prices WHERE currency = ?').bind(currency)),

  // ---- rate events
  countRate: async (db: D1Database, key: string, since: number) =>
    (await first<{ n: number }>(db.prepare('SELECT COUNT(*) AS n FROM rate_events WHERE key = ? AND at > ?').bind(key, since)))?.n ?? 0,
  addRate: (db: D1Database, key: string) => db.prepare('INSERT INTO rate_events (key, at) VALUES (?, ?)').bind(key, now()).run(),

  // ---- meta
  getMeta: async (db: D1Database, key: string) =>
    (await first<{ value: string }>(db.prepare('SELECT value FROM meta WHERE key = ?').bind(key)))?.value ?? null,
  setMeta: (db: D1Database, key: string, value: string) =>
    db.prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').bind(key, value).run(),

  /** Periodic cleanup of short-lived rows. */
  cleanup: (db: D1Database) =>
    db.batch([
      db.prepare('DELETE FROM auth_challenges WHERE expires_at < ?').bind(now() - 3600),
      db.prepare('DELETE FROM handoffs WHERE expires_at < ?').bind(now() - 3600),
      db.prepare('DELETE FROM rate_events WHERE at < ?').bind(now() - 2 * 86400),
      db.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now()),
    ]),
};

// ---- API serializers (camelCase, never leak other customers' data)
export const serialize = {
  merchant: (m: MerchantRow) => ({ id: m.id, name: m.name, city: m.city, address: m.address, createdAt: m.created_at, status: m.status }),
  merchantPublic: (m: MerchantRow) => ({ id: m.id, name: m.name, city: m.city, address: m.address }),
  card: (c: CardRow) => ({
    id: c.id,
    merchantId: c.merchant_id,
    title: c.title,
    rewardText: c.reward_text,
    stampsRequired: c.stamps_required,
    minFiatAmount: c.min_fiat_amount,
    fiatCurrency: c.fiat_currency,
    velocityMinutes: c.velocity_minutes,
    createdAt: c.created_at,
  }),
  customerCard: (cc: CustomerCardRow) => ({
    id: cc.id,
    cardId: cc.card_id,
    address: cc.address,
    stamps: cc.stamps,
    lifetimeStamps: cc.lifetime_stamps,
    lastStampAt: cc.last_stamp_at,
    createdAt: cc.created_at,
  }),
  intent: (i: IntentRow, toAddress: string) => ({
    id: i.id,
    memo: i.memo,
    toAddress,
    amountLuna: i.expected_luna,
    amountNim: i.expected_luna / 100_000,
    fiatAmount: i.fiat_amount,
    fiatCurrency: i.fiat_currency,
    nimPriceFiat: i.nim_price_fiat,
    createdAt: i.created_at,
    expiresAt: i.expires_at,
    status: i.status,
    lastError: i.last_error,
  }),
  stamp: (s: StampRow) => ({
    id: s.id,
    customerCardId: s.customer_card_id,
    txHash: s.tx_hash,
    amountLuna: s.amount_luna,
    fiatAmount: s.fiat_amount,
    fiatCurrency: s.fiat_currency,
    blockHeight: s.block_height,
    source: s.source,
    counted: s.counted === 1,
    createdAt: s.created_at,
  }),
  redemption: (r: RedemptionRow) => ({
    id: r.id,
    customerCardId: r.customer_card_id,
    code: r.code,
    status: r.status,
    issuedAt: r.issued_at,
    expiresAt: r.expires_at,
    confirmedAt: r.confirmed_at,
  }),
};
