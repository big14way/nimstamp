import { describe, expect, it } from 'vitest';
import { buildMemo, decodeTxData, parseMemo } from '../src/lib/memo';
import { bytesToHex, utf8ToBytes } from '../src/lib/hex';

describe('memo', () => {
  it('builds and parses', () => {
    const memo = buildMemo('K7Q2M9XA', 'AB23CD');
    expect(memo).toBe('NS1:K7Q2M9XA:AB23CD');
    expect(utf8ToBytes(memo).length).toBe(19);
    expect(parseMemo(memo)).toEqual({ cardId: 'K7Q2M9XA', nonce: 'AB23CD' });
  });
  it('rejects other prefixes and shapes', () => {
    expect(parseMemo('NS2:K7Q2M9XA:AB23CD')).toBeNull();
    expect(parseMemo('NS1:k7q2m9xa:AB23CD')).toBeNull();
    expect(parseMemo('NS1:K7Q2M9XA:AB23C')).toBeNull();
    expect(parseMemo('')).toBeNull();
  });
  it('decodes recipientData as utf8 text', () => {
    // Real chain sample: "You mined NIM on Nimiq.Space!"
    expect(decodeTxData('596f75206d696e6564204e494d206f6e204e696d69712e537061636521')).toBe('You mined NIM on Nimiq.Space!');
    const memo = 'NS1:K7Q2M9XA:AB23CD';
    expect(decodeTxData(bytesToHex(utf8ToBytes(memo)))).toBe(memo);
  });
  it('decodes hex-of-text if a host hex-encoded the data string', () => {
    const memo = 'NS1:K7Q2M9XA:AB23CD';
    const hexText = bytesToHex(utf8ToBytes(memo)); // what the host would have sent as "data"
    const onChain = bytesToHex(utf8ToBytes(hexText)); // stored as the ascii hex string
    expect(decodeTxData(onChain)).toBe(memo);
    expect(decodeTxData('')).toBe('');
  });
});
