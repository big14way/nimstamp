import type { CardRow, CustomerCardRow, IntentRow } from '../db/queries';
import type { ErrorCode } from '../lib/errors';
import { sameAddress } from '../lib/address';
import { decodeTxData, parseMemo } from '../lib/memo';
import type { RpcTx } from './rpc';

export type MatchFailure = Extract<
  ErrorCode,
  'TX_WRONG_RECIPIENT' | 'TX_NOT_FOUND' | 'TX_NO_INTENT' | 'TX_WRONG_SENDER' | 'INTENT_EXPIRED' | 'AMOUNT_TOO_LOW'
>;

export interface MatchInput {
  tx: RpcTx;
  merchantAddress: string;
  card: CardRow;
  intent: IntentRow | null;
  customerCard: CustomerCardRow | null;
  /** manual claim relaxes the expiry rule (intent may be expired, ≤ 24 h old) */
  relaxed: boolean;
}

export type MatchResult = { ok: true; velocityBlocked: boolean } | { ok: false; code: MatchFailure };

export const txTimeSec = (tx: RpcTx) => Math.floor((tx.timestamp || 0) / 1000);

/** Pure §7.3 rules. Callers resolve the intent (by memo or by sender) before calling. */
export function evaluate(input: MatchInput): MatchResult {
  const { tx, merchantAddress, card, intent, customerCard, relaxed } = input;
  if (!sameAddress(tx.to, merchantAddress)) return { ok: false, code: 'TX_WRONG_RECIPIENT' };
  if (tx.blockNumber == null || tx.executionResult === false) return { ok: false, code: 'TX_NOT_FOUND' };
  if (!intent || !customerCard) return { ok: false, code: 'TX_NO_INTENT' };
  if (intent.card_id !== card.id || customerCard.card_id !== card.id) return { ok: false, code: 'TX_NO_INTENT' };
  if (!sameAddress(customerCard.address, tx.from)) return { ok: false, code: 'TX_WRONG_SENDER' };

  const t = txTimeSec(tx);
  if (intent.status === 'matched') return { ok: false, code: 'TX_NO_INTENT' };
  if (relaxed) {
    if (intent.created_at < t - 86400) return { ok: false, code: 'INTENT_EXPIRED' };
  } else if (intent.status !== 'pending' || intent.expires_at <= t - 60) {
    return { ok: false, code: 'INTENT_EXPIRED' };
  }
  if (tx.value < intent.expected_luna) return { ok: false, code: 'AMOUNT_TOO_LOW' };

  const windowSec = card.velocity_minutes * 60;
  const velocityBlocked = customerCard.last_stamp_at != null && customerCard.last_stamp_at > t - windowSec;
  return { ok: true, velocityBlocked };
}

/** Which intent a transaction refers to: by memo (Plan A) or "no memo, use sender" (Plan B). */
export function classifyTx(tx: RpcTx): { kind: 'memo'; cardId: string; nonce: string; memo: string } | { kind: 'plain'; memo: string } {
  const memo = decodeTxData(tx.recipientData);
  const parsed = parseMemo(memo);
  if (parsed) return { kind: 'memo', ...parsed, memo };
  return { kind: 'plain', memo };
}
