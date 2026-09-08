import { Hono } from 'hono';
import { z } from 'zod';
import { RpcClient } from '../chain/rpc';
import { isMockSignature, verifyWalletSignature } from '../crypto/verify';
import { q, serialize, type CardRow, type CustomerCardRow } from '../db/queries';
import { isDemo, type Env } from '../env';
import { normalizeAddress, sameAddress } from '../lib/address';
import { redeemMessage, type Vars } from '../lib/auth';
import { ApiError } from '../lib/errors';
import { newCode, newNonce, newRowId } from '../lib/ids';
import { decodeTxData, REDEEM_MEMO_RE } from '../lib/memo';
import { MINUTE, now } from '../lib/time';
import { parseBody } from '../lib/validate';

export const redemptions = new Hono<{ Bindings: Env; Variables: Vars }>();

const addressSchema = z.string().refine((a) => {
  try {
    normalizeAddress(a);
    return true;
  } catch {
    return false;
  }
}, 'Invalid NIM address');

async function loadCustomer(env: Env, id: string, address: string): Promise<{ cc: CustomerCardRow; card: CardRow }> {
  const cc = await q.customerCardById(env.DB, id.toUpperCase());
  if (!cc || cc.address !== normalizeAddress(address)) throw new ApiError('NOT_FOUND');
  const card = (await q.cardById(env.DB, cc.card_id))!;
  return { cc, card };
}

/** Step 1: server builds the exact message the wallet must sign (§9.1). */
redemptions.post('/customer-cards/:id/redemptions/challenge', async (c) => {
  const body = await parseBody(c, z.object({ address: addressSchema }));
  const { cc, card } = await loadCustomer(c.env, c.req.param('id'), body.address);
  const active = await q.activeRedemption(c.env.DB, cc.id);
  if (active) throw new ApiError('REDEMPTION_ACTIVE', undefined, { redemption: serialize.redemption(active) });
  if (cc.stamps < card.stamps_required) throw new ApiError('NOT_ENOUGH_STAMPS');
  const nonce = newNonce();
  const t = now();
  const expiresAt = t + 5 * MINUTE;
  const message = redeemMessage(card.id, cc.id, nonce, expiresAt);
  await c.env.DB.prepare('INSERT INTO auth_challenges (nonce, purpose, address, subject, message, created_at, expires_at) VALUES (?,?,?,?,?,?,?)')
    .bind(nonce, 'redeem', cc.address, cc.id, message, t, expiresAt)
    .run();
  return c.json({ nonce, message, expiresAt });
});

const redeemSchema = z.object({
  address: addressSchema,
  nonce: z.string().length(6),
  signature: z.unknown().optional(),
  publicKey: z.unknown().optional(),
  txHash: z.string().regex(/^[0-9a-fA-F]{64}$/).optional(),
});

/** Step 2: verify signature (Plan A) or NSR memo tx (Plan B); issue code and decrement stamps atomically (§9.4). */
redemptions.post('/customer-cards/:id/redemptions', async (c) => {
  const body = await parseBody(c, redeemSchema);
  const { cc, card } = await loadCustomer(c.env, c.req.param('id'), body.address);
  const db = c.env.DB;
  const merchant = (await q.merchantById(db, card.merchant_id))!;

  const active = await q.activeRedemption(db, cc.id);
  if (active) return c.json({ redemption: serialize.redemption(active), reused: true });

  const ch = await q.challenge(db, body.nonce.toUpperCase());
  if (!ch || ch.purpose !== 'redeem' || ch.subject !== cc.id || ch.address !== cc.address) throw new ApiError('SIGNATURE_INVALID');
  if (ch.expires_at < now()) {
    await q.deleteChallenge(db, ch.nonce);
    throw new ApiError('CHALLENGE_EXPIRED');
  }

  let signature: string | null = null;
  let txHash: string | null = null;
  if (body.txHash) {
    const tx = await RpcClient.fromEnv(c.env).getTransactionByHash(body.txHash.toLowerCase());
    if (!tx) throw new ApiError('TX_NOT_FOUND');
    const m = REDEEM_MEMO_RE.exec(decodeTxData(tx.recipientData));
    if (!m || m[1] !== ch.nonce || !sameAddress(tx.from, cc.address) || !sameAddress(tx.to, merchant.address)) throw new ApiError('SIGNATURE_INVALID');
    txHash = tx.hash;
  } else if (isDemo(c.env) && isMockSignature(body.signature)) {
    if (String(body.signature) !== `mock:${cc.address}`) throw new ApiError('SIGNATURE_INVALID');
    signature = 'mock';
  } else {
    const r = verifyWalletSignature({ message: ch.message, publicKey: body.publicKey, signature: body.signature });
    if (!r.ok || r.address !== cc.address) throw new ApiError('SIGNATURE_INVALID');
    signature = typeof body.signature === 'string' ? body.signature : JSON.stringify(body.signature);
  }

  if (cc.stamps < card.stamps_required) throw new ApiError('NOT_ENOUGH_STAMPS');

  const id = newRowId();
  const code = newCode();
  const t = now();
  // Guarded decrement: only succeeds if the customer still has enough stamps (prevents double redemption).
  const result = await db.batch([
    db.prepare('DELETE FROM auth_challenges WHERE nonce = ?').bind(ch.nonce),
    db.prepare('UPDATE customer_cards SET stamps = stamps - ? WHERE id = ? AND stamps >= ?').bind(card.stamps_required, cc.id, card.stamps_required),
    db
      .prepare('INSERT INTO redemptions (id, customer_card_id, card_id, code, message, signature, tx_hash, status, issued_at, expires_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .bind(id, cc.id, card.id, code, ch.message, signature, txHash, 'issued', t, t + 10 * MINUTE),
  ]);
  if ((result[1]?.meta.changes ?? 0) === 0) {
    await db.prepare('DELETE FROM redemptions WHERE id = ?').bind(id).run();
    throw new ApiError('NOT_ENOUGH_STAMPS');
  }
  const redemption = (await q.redemptionById(db, id))!;
  return c.json({ redemption: serialize.redemption(redemption), reused: false }, 201);
});

redemptions.get('/redemptions/:id', async (c) => {
  const r = await q.redemptionById(c.env.DB, c.req.param('id'));
  if (!r) throw new ApiError('NOT_FOUND');
  const card = (await q.cardById(c.env.DB, r.card_id))!;
  const merchant = (await q.merchantById(c.env.DB, card.merchant_id))!;
  const status = r.status === 'issued' && r.expires_at < now() ? 'expired' : r.status;
  return c.json({
    id: r.id,
    status,
    code: status === 'expired' ? undefined : r.code,
    issuedAt: r.issued_at,
    expiresAt: r.expires_at,
    confirmedAt: r.confirmed_at,
    merchantName: merchant.name,
    rewardText: card.reward_text,
    cardId: card.id,
    customerCardId: r.customer_card_id,
  });
});
