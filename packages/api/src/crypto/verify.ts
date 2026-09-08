import { ed25519 } from '@noble/curves/ed25519.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { coerceBytes, utf8ToBytes } from '../lib/hex';
import { addressFromPublicKey } from '../lib/address';

/**
 * Nimiq's signed-message convention (Hub `HubApi.MSG_PREFIX`, Keyguard `Key.signMessage`):
 *   sign( sha256( '\x16Nimiq Signed Message:\n' + byteLength(message) + message ) )
 */
export const SIGNED_MESSAGE_PREFIX = '\x16Nimiq Signed Message:\n';

export type SigScheme = 'nimiq-signed-message' | 'prefixed-raw' | 'raw';

/** Schemes are tried in this order; the first that verifies wins. */
export const SCHEMES: SigScheme[] = ['nimiq-signed-message', 'prefixed-raw', 'raw'];

export function signedBytes(message: string, scheme: SigScheme): Uint8Array {
  const msg = utf8ToBytes(message);
  if (scheme === 'raw') return msg;
  const prefixed = concat(utf8ToBytes(SIGNED_MESSAGE_PREFIX), utf8ToBytes(String(msg.length)), msg);
  return scheme === 'prefixed-raw' ? prefixed : sha256(prefixed);
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const len = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

export interface VerifyResult {
  ok: boolean;
  scheme?: SigScheme;
  address?: string;
}

/**
 * Verify an Ed25519 signature produced by Nimiq Pay's `sign()` over `message`.
 * Never throws: malformed keys/signatures simply return { ok: false }.
 */
export function verifyWalletSignature(args: {
  message: string;
  publicKey: unknown;
  signature: unknown;
}): VerifyResult {
  let pub: Uint8Array;
  let sig: Uint8Array;
  try {
    pub = coerceBytes(args.publicKey);
    sig = coerceBytes(args.signature);
  } catch {
    return { ok: false };
  }
  if (pub.length !== 32 || sig.length !== 64) return { ok: false };
  for (const scheme of SCHEMES) {
    try {
      if (ed25519.verify(sig, signedBytes(args.message, scheme), pub)) {
        return { ok: true, scheme, address: addressFromPublicKey(pub) };
      }
    } catch {
      /* try next */
    }
  }
  return { ok: false };
}

/** Demo-mode signature shape produced by the web mock provider. Never accepted in production. */
export function isMockSignature(signature: unknown): boolean {
  return typeof signature === 'string' && signature.startsWith('mock:');
}
