import { Hono } from 'hono';
import { z } from 'zod';
import { RpcClient, RpcError } from '../chain/rpc';
import { checkMerchant, processTx } from '../chain/watcher';
import { q, serialize } from '../db/queries';
import type { Env } from '../env';
import { type Vars } from '../lib/auth';
import { ApiError } from '../lib/errors';
import { HOUR, now } from '../lib/time';
import { parseBody } from '../lib/validate';

export const payments = new Hono<{ Bindings: Env; Variables: Vars }>();

const txHashSchema = z.string().trim().regex(/^(0x)?[0-9a-fA-F]{64}$/, 'Transaction hash must be 64 hex characters').transform((h) => h.replace(/^0x/, '').toLowerCase());
const MAX_CLAIMS_PER_HOUR = 5;

/** Optional hint after the wallet returns: triggers an immediate check (§7.1 step 5). */
payments.post('/notify', async (c) => {
  const body = await parseBody(c, z.object({ intentId: z.string().length(6), txHash: txHashSchema.optional() }));
  const intent = await q.intentById(c.env.DB, body.intentId.toUpperCase());
  if (!intent) throw new ApiError('NOT_FOUND');
  const card = await q.cardById(c.env.DB, intent.card_id);
  const merchant = card ? await q.merchantById(c.env.DB, card.merchant_id) : null;
  if (!card || !merchant) throw new ApiError('NOT_FOUND');

  const work = (async () => {
    try {
      if (body.txHash) {
        const tx = await RpcClient.fromEnv(c.env).getTransactionByHash(body.txHash);
        if (tx) await processTx(c.env, merchant, card, tx, { source: 'watcher' });
      }
      await checkMerchant(c.env, merchant.id);
    } catch (e) {
      console.log(`notify check failed: ${String(e)}`);
    }
  })();
  c.executionCtx.waitUntil(work);
  return c.body(null, 202);
});

/** "I paid but got no stamp" (§7.5). Server fetches the tx itself; never trusts client fields. */
payments.post('/claim', async (c) => {
  const body = await parseBody(c, z.object({ customerCardId: z.string().length(8), txHash: txHashSchema }));
  const db = c.env.DB;
  const cc = await q.customerCardById(db, body.customerCardId.toUpperCase());
  if (!cc) throw new ApiError('NOT_FOUND');
  const card = (await q.cardById(db, cc.card_id))!;
  const merchant = (await q.merchantById(db, card.merchant_id))!;

  const key = `claim:${cc.id}`;
  if ((await q.countRate(db, key, now() - HOUR)) >= MAX_CLAIMS_PER_HOUR) throw new ApiError('RATE_LIMITED', 'Too many claims this hour. Please try again later.');
  await q.addRate(db, key);

  const existing = await q.stampByTx(db, body.txHash);
  if (existing) throw new ApiError('ALREADY_STAMPED');

  let tx;
  try {
    tx = await RpcClient.fromEnv(c.env).getTransactionByHash(body.txHash);
  } catch (e) {
    if (e instanceof RpcError) throw new ApiError('RPC_DOWN');
    throw e;
  }
  if (!tx) throw new ApiError('TX_NOT_FOUND');

  const r = await processTx(c.env, merchant, card, tx, { source: 'manual_claim', customerCardId: cc.id });
  if (r.status === 'stamped') {
    return c.json({ stamp: serialize.stamp(r.stamp), counted: r.counted, ...(r.counted ? {} : { warning: 'VELOCITY_LIMIT' }) }, 201);
  }
  if (r.code === 'IGNORED') throw new ApiError('TX_NO_INTENT');
  throw new ApiError(r.code);
});
