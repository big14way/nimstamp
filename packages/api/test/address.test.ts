import { describe, expect, it } from 'vitest';
import { addressFromPublicKey, isValidAddress, maskAddress, normalizeAddress, sameAddress } from '../src/lib/address';
import { hexToBytes } from '../src/lib/hex';

// Real mainnet vector: sender public key taken from a basic tx signature proof (tx f432435f…).
const PUB = '4b93586f7555e72b218bb522d66bf52d9c38b8396bd8bfd45c99c3c282c53ba1';
const ADDR = 'NQ16 2SSN 82TL SMQS KXT3 Q01V CMAL NU6F 1LJG';

describe('address', () => {
  it('normalizes spacing and case', () => {
    expect(normalizeAddress('nq16 2ssn82tlsmqskxt3q01vcmalnu6f1ljg')).toBe(ADDR);
    expect(normalizeAddress('NQ162SSN82TLSMQSKXT3Q01VCMALNU6F1LJG')).toBe(ADDR);
  });
  it('rejects bad checksums and shapes', () => {
    expect(isValidAddress('NQ17 2SSN 82TL SMQS KXT3 Q01V CMAL NU6F 1LJG')).toBe(false);
    expect(isValidAddress('NQ16 2SSN 82TL')).toBe(false);
    expect(isValidAddress('hello')).toBe(false);
    expect(isValidAddress('NQ07 0000 0000 0000 0000 0000 0000 0000 0000')).toBe(true);
  });
  it('derives the address from a public key', () => {
    expect(addressFromPublicKey(hexToBytes(PUB))).toBe(ADDR);
  });
  it('masks and compares', () => {
    expect(maskAddress(ADDR)).toBe('NQ16 … 1LJG');
    expect(sameAddress(ADDR, ADDR.toLowerCase())).toBe(true);
    expect(sameAddress(ADDR, 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000')).toBe(false);
  });
});
