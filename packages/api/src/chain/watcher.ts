import type { Env } from '../env';
import { q, type CardRow, type CustomerCardRow, type IntentRow, type MerchantRow, type StampRow } from '../db/queries';
import { normalizeAddress } from '../lib/address';
import { newRowId } from '../lib/ids';
import { buildMemo } from '../lib/memo';
import { now } from '../lib/time';
import { classifyTx, evaluate, txTimeSec, type MatchFailure } from './matching';
import { RpcClient, RpcError, type RpcTx } from './rpc';

export type ProcessOutcome =
  | { status: 'stamped'; stamp: StampRow; counted: boolean }
  | { status: 'skipped'; code: MatchFailure | 'ALREADY_STAMPED' | 'IGNORED' };

const MAX_MERCHANTS_PER_RUN = 50;

/**
 * Try to turn one on-chain transaction into a stamp for `merchant`.
 * Idempotent: the stamps.tx_hash UNIQUE constraint makes a second call a no-op.
 */
export async function processTx(
  env: Env,
  merchant: MerchantRow,
  card: CardRow,
  tx: RpcTx,
  opts: { source: 'watcher' | 'manual_claim'; customerCardId?: string },
): Promise<ProcessOutcome> {
  const db = env.DB;
  if (await q.stampByTx(db, tx.hash)) return { status: 'skipped', code: 'ALREADY_STAMPED' };

  const cls = classifyTx(tx);
  // Login / redemption memos (Plan B) are handled by their endpoints, not here.
  if (cls.kind === 'plain' && /^NS[AR]:/.test(cls.memo)) return { status: 'skipped', code: 'IGNORED' };

  let intent: IntentRow | null = null;
  let customerCard: CustomerCardRow | null = null;
  const relaxed = opts.source === 'manual_claim';

  if (cls.kind === 'memo') {
    if (cls.cardId !== card.id) return { status: 'skipped', code: 'TX_WRONG_RECIPIENT' };
    intent = await q.intentByMemo(db, buildMemo(cls.cardId, cls.nonce));
    if (intent) customerCard = await q.customerCardById(db, intent.customer_card_id);
  } else {
    // Plan B: no memo — match by sender to the customer's most recent intent.
    let sender: string;
    try {
      sender = normalizeAddress(tx.from);
    } catch {
      return { status: 'skipped', code: 'TX_WRONG_SENDER' };
    }
    customerCard = await q.customerCardByAddress(db, card.id, sender);
    if (customerCard) {
      intent = relaxed ? await q.latestClaimableIntent(db, customerCard.id) : await q.latestPendingIntent(db, customerCard.id);
      if (intent && !relaxed && intent.created_at < txTimeSec(tx) - 900) intent = null;
    }
  }
  if (opts.customerCardId && customerCard && customerCard.id !== opts.customerCardId) {
    return { status: 'skipped', code: 'TX_WRONG_SENDER' };
  }

  const result = evaluate({ tx, merchantAddress: merchant.address, card, intent, customerCard, relaxed });
  if (!result.ok) {
    if (intent && result.code === 'AMOUNT_TOO_LOW') {
      await db.prepare('UPDATE payment_intents SET last_error = ? WHERE id = ?').bind('AMOUNT_TOO_LOW', intent.id).run();
    }
    return { status: 'skipped', code: result.code };
  }

  const counted = result.velocityBlocked ? 0 : 1;
  const stamp: StampRow = {
    id: newRowId(),
    customer_card_id: customerCard!.id,
    card_id: card.id,
    tx_hash: tx.hash,
    intent_id: intent!.id,
    amount_luna: tx.value,
    fiat_amount: intent!.fiat_amount,
    fiat_currency: intent!.fiat_currency,
    block_height: tx.blockNumber!,
    source: opts.source,
    counted,
    created_at: now(),
  };
  const statements = [
    db
      .prepare(
        'INSERT INTO stamps (id, customer_card_id, card_id, tx_hash, intent_id, amount_luna, fiat_amount, fiat_currency, block_height, source, counted, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      )
      .bind(stamp.id, stamp.customer_card_id, stamp.card_id, stamp.tx_hash, stamp.intent_id, stamp.amount_luna, stamp.fiat_amount, stamp.fiat_currency, stamp.block_height, stamp.source, stamp.counted, stamp.created_at),
    db.prepare("UPDATE payment_intents SET status = 'matched', last_error = ? WHERE id = ?").bind(counted ? null : 'VELOCITY_LIMIT', intent!.id),
  ];
  if (counted) {
    statements.push(
      db
        .prepare('UPDATE customer_cards SET stamps = stamps + 1, lifetime_stamps = lifetime_stamps + 1, last_stamp_at = ? WHERE id = ?')
        .bind(txTimeSec(tx), customerCard!.id),
    );
  }
  try {
    await db.batch(statements);
  } catch (e) {
    if (/UNIQUE/i.test(String(e))) return { status: 'skipped', code: 'ALREADY_STAMPED' };
    throw e;
  }
  console.log(`stamp ${counted ? 'counted' : 'recorded'} card=${card.id} src=${opts.source} h=${tx.blockNumber}`);
  return { status: 'stamped', stamp, counted: counted === 1 };
}

export interface CheckResult {
  merchantId: string;
  scanned: number;
  stamped: number;
  error?: string;
}

/** Poll one merchant's address history and stamp everything new (§7.4). Never advances the cursor on error. */
export async function checkMerchant(env: Env, merchantId: string): Promise<CheckResult> {
  const db = env.DB;
  const merchant = await q.merchantById(db, merchantId);
  const card = merchant ? await q.cardByMerchant(db, merchant.id) : null;
  if (!merchant || !card) return { merchantId, scanned: 0, stamped: 0, error: 'no merchant' };
  const state = (await q.watcherState(db, merchantId)) ?? { merchant_id: merchantId, last_seen_height: 0, last_polled_at: null, last_error: null };

  let txs: RpcTx[];
  try {
    txs = await RpcClient.fromEnv(env).getTransactionsByAddress(merchant.address, 100);
  } catch (e) {
    const msg = e instanceof RpcError ? e.message : String(e);
    await db
      .prepare('INSERT INTO watcher_state (merchant_id, last_seen_height, last_polled_at, last_error) VALUES (?,?,?,?) ON CONFLICT(merchant_id) DO UPDATE SET last_polled_at = excluded.last_polled_at, last_error = excluded.last_error')
      .bind(merchantId, state.last_seen_height, now(), msg.slice(0, 200))
      .run();
    console.log(`watcher rpc error merchant=${merchantId}: ${msg}`);
    return { merchantId, scanned: 0, stamped: 0, error: msg };
  }

  const fresh = txs
    .filter((t) => t.blockNumber != null && t.blockNumber > state.last_seen_height)
    .sort((a, b) => a.blockNumber! - b.blockNumber!);
  let stamped = 0;
  let maxHeight = state.last_seen_height;
  for (const tx of fresh) {
    try {
      const r = await processTx(env, merchant, card, tx, { source: 'watcher' });
      if (r.status === 'stamped' && r.counted) stamped++;
      maxHeight = Math.max(maxHeight, tx.blockNumber!);
    } catch (e) {
      // DB failure: stop here so the cursor stays below this tx and it is retried next minute.
      console.log(`watcher process error merchant=${merchantId} tx=${tx.hash.slice(0, 8)}: ${String(e)}`);
      break;
    }
  }
  await db
    .prepare('INSERT INTO watcher_state (merchant_id, last_seen_height, last_polled_at, last_error) VALUES (?,?,?,NULL) ON CONFLICT(merchant_id) DO UPDATE SET last_seen_height = excluded.last_seen_height, last_polled_at = excluded.last_polled_at, last_error = NULL')
    .bind(merchantId, maxHeight, now())
    .run();
  return { merchantId, scanned: fresh.length, stamped };
}

/** Cron entry point: expiries, then every active merchant (capped). */
export async function runWatcher(env: Env): Promise<CheckResult[]> {
  const db = env.DB;
  await q.expireIntents(db);
  await q.expireRedemptions(db);
  const merchants = await q.activeMerchants(db, MAX_MERCHANTS_PER_RUN);
  const results: CheckResult[] = [];
  for (const m of merchants) {
    results.push(await checkMerchant(env, m.id));
  }
  await q.setMeta(db, 'lastWatcherRun', String(now()));
  return results;
}
