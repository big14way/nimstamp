import { Hono } from 'hono';
import { z } from 'zod';
import { processTx } from '../chain/watcher';
import { q } from '../db/queries';
import { isDemo, type Env } from '../env';
import { normalizeAddress } from '../lib/address';
import type { Vars } from '../lib/auth';
import { ApiError } from '../lib/errors';
import { bytesToHex, utf8ToBytes } from '../lib/hex';
import { parseBody } from '../lib/validate';

/**
 * DEMO_MODE only (never enabled in production): lets the web mock wallet "pay" without a chain.
 * Simulates a confirmed on-chain transaction and runs it through the exact same matcher.
 */
export const demo = new Hono<{ Bindings: Env; Variables: Vars }>();

demo.use('*', async (c, next) => {
  if (!isDemo(c.env)) throw new ApiError('NOT_FOUND');
  await next();
});

demo.post('/pay', async (c) => {
  const body = await parseBody(c, z.object({ from: z.string(), to: z.string(), value: z.number().int().nonnegative(), memo: z.string().max(64).optional(), hash: z.string().regex(/^[0-9a-f]{64}$/) }));
  const merchant = await q.merchantByAddress(c.env.DB, normalizeAddress(body.to));
  const card = merchant ? await q.cardByMerchant(c.env.DB, merchant.id) : null;
  if (!merchant || !card) throw new ApiError('NOT_FOUND');
  const height = Number((await q.getMeta(c.env.DB, 'demoHeight')) ?? 1) + 1;
  await q.setMeta(c.env.DB, 'demoHeight', String(height));
  const r = await processTx(
    c.env,
    merchant,
    card,
    { hash: body.hash, blockNumber: height, timestamp: Date.now(), from: normalizeAddress(body.from), to: merchant.address, value: body.value, fee: 0, senderData: '', recipientData: body.memo ? bytesToHex(utf8ToBytes(body.memo)) : '', executionResult: true },
    { source: 'watcher' },
  );
  return c.json(r);
});
