import { sha256 } from '@noble/hashes/sha2.js';
import type { Context } from 'hono';
import type { Env } from '../env';
import { q, type SessionRow } from '../db/queries';
import { ApiError } from '../lib/errors';
import { bytesToHex, utf8ToBytes } from './hex';
import { randomHex } from './ids';
import { DAY, now } from './time';

export const hashToken = (token: string) => bytesToHex(sha256(utf8ToBytes(token)));
export const hashIp = (ip: string, secret?: string) => bytesToHex(sha256(utf8ToBytes(`${secret ?? ''}|${ip}`))).slice(0, 32);

export async function createSession(env: Env, address: string, merchantId: string | null): Promise<string> {
  const token = randomHex(32);
  const t = now();
  await env.DB.prepare('INSERT INTO sessions (token, merchant_id, address, created_at, expires_at) VALUES (?,?,?,?,?)')
    .bind(hashToken(token), merchantId, address, t, t + 30 * DAY)
    .run();
  return token;
}

export type Vars = { session: SessionRow; ip: string };

export type Ctx = Context<{ Bindings: Env; Variables: Vars }>;

export function clientIp(c: Ctx): string {
  return c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0';
}

export async function requireSession(c: Ctx): Promise<SessionRow> {
  const header = c.req.header('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!/^[0-9a-f]{64}$/.test(token)) throw new ApiError('UNAUTHORIZED');
  const session = await q.sessionByToken(c.env.DB, hashToken(token));
  if (!session) throw new ApiError('UNAUTHORIZED');
  c.set('session', session);
  return session;
}

export function loginMessage(address: string, nonce: string, expiresAt: number): string {
  return `NimStamp login\nAddress: ${address}\nNonce: ${nonce}\nExpires: ${new Date(expiresAt * 1000).toISOString()}`;
}

export function redeemMessage(cardId: string, customerCardId: string, nonce: string, expiresAt: number): string {
  return `NimStamp redeem\nCard: ${cardId}\nCustomer: ${customerCardId}\nNonce: ${nonce}\nExpires: ${new Date(expiresAt * 1000).toISOString()}`;
}
