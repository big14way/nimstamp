import { Hono } from 'hono';
import { z } from 'zod';
import { RpcClient } from '../chain/rpc';
import { isMockSignature, verifyWalletSignature } from '../crypto/verify';
import { q, serialize } from '../db/queries';
import { appUrl, isDemo, type Env } from '../env';
import { normalizeAddress, sameAddress } from '../lib/address';
import { createSession, hashToken, loginMessage, requireSession, type Vars } from '../lib/auth';
import { ApiError } from '../lib/errors';
import { newNonce, randomId } from '../lib/ids';
import { decodeTxData, LOGIN_MEMO_RE } from '../lib/memo';
import { MINUTE, now } from '../lib/time';
import { parseBody } from '../lib/validate';

export const auth = new Hono<{ Bindings: Env; Variables: Vars }>();

const addressSchema = z.string().min(36).max(44).refine((a) => {
  try {
    normalizeAddress(a);
    return true;
  } catch {
    return false;
  }
}, 'Invalid NIM address');

auth.post('/challenge', async (c) => {
  const { address } = await parseBody(c, z.object({ address: addressSchema }));
  const addr = normalizeAddress(address);
  const nonce = newNonce();
  const t = now();
  const expiresAt = t + 5 * MINUTE;
  const message = loginMessage(addr, nonce, expiresAt);
  await c.env.DB.prepare('INSERT INTO auth_challenges (nonce, purpose, address, subject, message, created_at, expires_at) VALUES (?,?,?,?,?,?,?)')
    .bind(nonce, 'login', addr, null, message, t, expiresAt)
    .run();
  return c.json({ nonce, message, expiresAt });
});

const verifySchema = z.object({
  address: addressSchema,
  nonce: z.string().length(6),
  signature: z.unknown().optional(),
  publicKey: z.unknown().optional(),
  txHash: z.string().regex(/^[0-9a-fA-F]{64}$/).optional(),
  handoff: z.string().length(8).optional(),
});

/**
 * Plan A: { address, nonce, signature, publicKey }.
 * Plan B: { address, nonce, txHash } — a zero-value tx to the user's own (merchant) address with memo NSA:<nonce>.
 */
auth.post('/verify', async (c) => {
  const body = await parseBody(c, verifySchema);
  const addr = normalizeAddress(body.address);
  const ch = await q.challenge(c.env.DB, body.nonce);
  if (!ch || ch.purpose !== 'login' || ch.address !== addr) throw new ApiError('SIGNATURE_INVALID');
  if (ch.expires_at < now()) {
    await q.deleteChallenge(c.env.DB, ch.nonce);
    throw new ApiError('CHALLENGE_EXPIRED');
  }

  if (body.txHash) {
    const tx = await RpcClient.fromEnv(c.env).getTransactionByHash(body.txHash.toLowerCase());
    if (!tx) throw new ApiError('TX_NOT_FOUND');
    const memo = decodeTxData(tx.recipientData);
    const m = LOGIN_MEMO_RE.exec(memo);
    if (!m || m[1] !== ch.nonce || !sameAddress(tx.from, addr)) throw new ApiError('SIGNATURE_INVALID');
  } else if (isDemo(c.env) && isMockSignature(body.signature)) {
    // Mock provider (non-production only): signature is "mock:<address>"
    if (String(body.signature) !== `mock:${addr}`) throw new ApiError('SIGNATURE_INVALID');
  } else {
    const r = verifyWalletSignature({ message: ch.message, publicKey: body.publicKey, signature: body.signature });
    if (!r.ok || r.address !== addr) throw new ApiError('SIGNATURE_INVALID');
    console.log(`login verified scheme=${r.scheme}`);
  }

  await q.deleteChallenge(c.env.DB, ch.nonce);
  const merchant = await q.merchantByAddress(c.env.DB, addr);
  const token = await createSession(c.env, addr, merchant?.id ?? null);

  if (body.handoff) {
    await c.env.DB.prepare('UPDATE handoffs SET token = ? WHERE nonce = ? AND expires_at > ?').bind(token, body.handoff, now()).run();
  }
  return c.json({ token, merchant: merchant ? serialize.merchant(merchant) : null });
});

auth.post('/logout', async (c) => {
  const header = c.req.header('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (token) await c.env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(hashToken(token)).run();
  return c.body(null, 204);
});

/** Laptop starts a handoff; phone signs at /m/login?handoff=<nonce>; laptop polls /auth/session/<nonce>. */
auth.post('/handoff', async (c) => {
  const nonce = randomId(8);
  const t = now();
  const expiresAt = t + 10 * MINUTE;
  await c.env.DB.prepare('INSERT INTO handoffs (nonce, token, created_at, expires_at) VALUES (?,NULL,?,?)').bind(nonce, t, expiresAt).run();
  const base = appUrl(c.env);
  const loginUrl = `${base}/m/login?handoff=${nonce}`;
  const host = base.replace(/^https?:\/\//, '');
  return c.json({ nonce, expiresAt, loginUrl, deepLink: `https://nimpay.app/miniapps/open/${host}/m/login?handoff=${nonce}`, schemeLink: `nimiqpay://miniapp?url=${encodeURIComponent(loginUrl)}` });
});

auth.get('/session/:nonce', async (c) => {
  const nonce = c.req.param('nonce');
  const row = await c.env.DB.prepare('SELECT token, expires_at FROM handoffs WHERE nonce = ?').bind(nonce).first<{ token: string | null; expires_at: number }>();
  if (!row || row.expires_at < now()) throw new ApiError('CHALLENGE_EXPIRED');
  if (!row.token) return c.json({ pending: true });
  // single pickup
  await c.env.DB.prepare('DELETE FROM handoffs WHERE nonce = ?').bind(nonce).run();
  const session = await q.sessionByToken(c.env.DB, hashToken(row.token));
  const merchant = session?.merchant_id ? await q.merchantById(c.env.DB, session.merchant_id) : null;
  return c.json({ token: row.token, merchant: merchant ? serialize.merchant(merchant) : null });
});

auth.get('/me', async (c) => {
  const s = await requireSession(c);
  const merchant = s.merchant_id ? await q.merchantById(c.env.DB, s.merchant_id) : null;
  return c.json({ address: s.address, merchant: merchant ? serialize.merchant(merchant) : null });
});
