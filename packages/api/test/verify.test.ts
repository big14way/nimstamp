import { describe, expect, it } from 'vitest';
import { ed25519 } from '@noble/curves/ed25519.js';
import { SCHEMES, isMockSignature, signedBytes, verifyWalletSignature } from '../src/crypto/verify';
import { addressFromPublicKey } from '../src/lib/address';
import { bytesToHex } from '../src/lib/hex';

const priv = ed25519.utils.randomSecretKey();
const pub = ed25519.getPublicKey(priv);
const message = 'NimStamp login\nAddress: NQ07 0000 0000 0000 0000 0000 0000 0000 0000\nNonce: AB23CD\nExpires: 2026-09-08T12:00:00.000Z';

describe('verifyWalletSignature', () => {
  for (const scheme of SCHEMES) {
    it(`accepts the ${scheme} scheme`, () => {
      const sig = ed25519.sign(signedBytes(message, scheme), priv);
      const r = verifyWalletSignature({ message, publicKey: bytesToHex(pub), signature: bytesToHex(sig) });
      expect(r.ok).toBe(true);
      expect(r.scheme).toBe(scheme);
      expect(r.address).toBe(addressFromPublicKey(pub));
    });
  }
  it('accepts base64 encoded key and signature', () => {
    const sig = ed25519.sign(signedBytes(message, 'nimiq-signed-message'), priv);
    const b64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));
    expect(verifyWalletSignature({ message, publicKey: b64(pub), signature: b64(sig) }).ok).toBe(true);
  });
  it('rejects a different message or key', () => {
    const sig = ed25519.sign(signedBytes(message, 'nimiq-signed-message'), priv);
    expect(verifyWalletSignature({ message: message + 'x', publicKey: bytesToHex(pub), signature: bytesToHex(sig) }).ok).toBe(false);
    const otherPub = ed25519.getPublicKey(ed25519.utils.randomSecretKey());
    expect(verifyWalletSignature({ message, publicKey: bytesToHex(otherPub), signature: bytesToHex(sig) }).ok).toBe(false);
  });
  it('never throws on garbage', () => {
    expect(verifyWalletSignature({ message, publicKey: 'zz', signature: 42 }).ok).toBe(false);
    expect(verifyWalletSignature({ message, publicKey: '', signature: '' }).ok).toBe(false);
  });
  it('detects mock signatures', () => {
    expect(isMockSignature('mock:abc')).toBe(true);
    expect(isMockSignature('abcd')).toBe(false);
  });
});
