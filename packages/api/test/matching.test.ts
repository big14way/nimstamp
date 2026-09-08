import { describe, expect, it } from 'vitest';
import { classifyTx, evaluate } from '../src/chain/matching';
import type { RpcTx } from '../src/chain/rpc';
import type { CardRow, CustomerCardRow, IntentRow } from '../src/db/queries';
import { bytesToHex, utf8ToBytes } from '../src/lib/hex';

const MERCHANT = 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000';
const CUSTOMER = 'NQ16 2SSN 82TL SMQS KXT3 Q01V CMAL NU6F 1LJG';
const T = 1_800_000_000; // tx time (unix s)

const card: CardRow = { id: 'K7Q2M9XA', merchant_id: 'M', title: 't', reward_text: 'r', stamps_required: 10, min_fiat_amount: 1000, fiat_currency: 'NGN', velocity_minutes: 10, created_at: 0 };
const cc: CustomerCardRow = { id: 'CC234567', card_id: card.id, address: CUSTOMER, device_id: null, stamps: 0, lifetime_stamps: 0, last_stamp_at: null, created_at: 0 };
const intent: IntentRow = { id: 'AB23CD', customer_card_id: cc.id, card_id: card.id, memo: 'NS1:K7Q2M9XA:AB23CD', expected_luna: 5000, nim_price_fiat: 0.2, fiat_amount: 1000, fiat_currency: 'NGN', created_at: T - 60, expires_at: T + 840, status: 'pending', last_error: null };
const tx = (over: Partial<RpcTx> = {}): RpcTx => ({ hash: 'a'.repeat(64), blockNumber: 100, timestamp: T * 1000, from: CUSTOMER, to: MERCHANT, value: 5000, fee: 0, senderData: '', recipientData: bytesToHex(utf8ToBytes(intent.memo)), executionResult: true, ...over });
const base = { tx: tx(), merchantAddress: MERCHANT, card, intent, customerCard: cc, relaxed: false };

describe('evaluate', () => {
  it('stamps an exact-minimum payment', () => expect(evaluate(base)).toEqual({ ok: true, velocityBlocked: false }));
  it('stamps a larger payment exactly once', () => expect(evaluate({ ...base, tx: tx({ value: 99999 }) })).toEqual({ ok: true, velocityBlocked: false }));
  it('rejects below minimum', () => expect(evaluate({ ...base, tx: tx({ value: 4999 }) })).toEqual({ ok: false, code: 'AMOUNT_TOO_LOW' }));
  it('rejects wrong recipient', () => expect(evaluate({ ...base, tx: tx({ to: CUSTOMER }) })).toEqual({ ok: false, code: 'TX_WRONG_RECIPIENT' }));
  it('rejects unconfirmed', () => expect(evaluate({ ...base, tx: tx({ blockNumber: null }) })).toEqual({ ok: false, code: 'TX_NOT_FOUND' }));
  it('rejects a sender that is not the intent owner', () => expect(evaluate({ ...base, tx: tx({ from: MERCHANT }) })).toEqual({ ok: false, code: 'TX_WRONG_SENDER' }));
  it('rejects missing intent', () => expect(evaluate({ ...base, intent: null })).toEqual({ ok: false, code: 'TX_NO_INTENT' }));
  it('rejects an intent for another card', () => expect(evaluate({ ...base, intent: { ...intent, card_id: 'OTHER123' } })).toEqual({ ok: false, code: 'TX_NO_INTENT' }));
  it('rejects expired intents (with 60 s grace)', () => {
    expect(evaluate({ ...base, intent: { ...intent, expires_at: T - 30 } })).toEqual({ ok: true, velocityBlocked: false });
    expect(evaluate({ ...base, intent: { ...intent, expires_at: T - 61 } })).toEqual({ ok: false, code: 'INTENT_EXPIRED' });
    expect(evaluate({ ...base, intent: { ...intent, status: 'expired' } })).toEqual({ ok: false, code: 'INTENT_EXPIRED' });
  });
  it('manual claim accepts expired intents up to 24h old', () => {
    expect(evaluate({ ...base, relaxed: true, intent: { ...intent, status: 'expired', expires_at: T - 7200, created_at: T - 8000 } })).toEqual({ ok: true, velocityBlocked: false });
    expect(evaluate({ ...base, relaxed: true, intent: { ...intent, status: 'expired', created_at: T - 90000 } })).toEqual({ ok: false, code: 'INTENT_EXPIRED' });
  });
  it('never matches an already matched intent', () => expect(evaluate({ ...base, intent: { ...intent, status: 'matched' } })).toEqual({ ok: false, code: 'TX_NO_INTENT' }));
  it('flags the velocity window', () => {
    expect(evaluate({ ...base, customerCard: { ...cc, last_stamp_at: T - 300 } })).toEqual({ ok: true, velocityBlocked: true });
    expect(evaluate({ ...base, customerCard: { ...cc, last_stamp_at: T - 601 } })).toEqual({ ok: true, velocityBlocked: false });
  });
});

describe('classifyTx', () => {
  it('reads NS1 memos', () => expect(classifyTx(tx())).toEqual({ kind: 'memo', cardId: 'K7Q2M9XA', nonce: 'AB23CD', memo: intent.memo }));
  it('treats everything else as plain', () => expect(classifyTx(tx({ recipientData: '' }))).toEqual({ kind: 'plain', memo: '' }));
});
