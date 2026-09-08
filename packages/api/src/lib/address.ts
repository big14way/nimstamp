import { blake2b } from '@noble/hashes/blake2.js';

/** Nimiq's own base32 alphabet (not RFC 4648). */
const NIMIQ_BASE32 = '0123456789ABCDEFGHJKLMNPQRSTUVXY';
const COMPACT_RE = /^NQ[0-9]{2}[0-9A-Z]{32}$/;

/** Uppercase, strip spaces, validate, then re-insert a space every 4 chars. */
export function normalizeAddress(input: string): string {
  const compact = input.toUpperCase().replace(/\s+/g, '');
  if (!COMPACT_RE.test(compact)) throw new Error('INVALID_ADDRESS');
  if (!checksumOk(compact)) throw new Error('INVALID_ADDRESS');
  return compact.replace(/(.{4})(?=.)/g, '$1 ');
}

export function isValidAddress(input: string): boolean {
  try {
    normalizeAddress(input);
    return true;
  } catch {
    return false;
  }
}

export function sameAddress(a: string, b: string): boolean {
  try {
    return normalizeAddress(a) === normalizeAddress(b);
  } catch {
    return false;
  }
}

/** "NQ12 …  ABCD" for public listings. */
export function maskAddress(address: string): string {
  const n = normalizeAddress(address);
  return `${n.slice(0, 4)} … ${n.slice(-4)}`;
}

function ibanCheck(str: string): number {
  const num = str
    .split('')
    .map((c) => {
      const code = c.charCodeAt(0);
      return code >= 48 && code <= 57 ? c : (code - 55).toString();
    })
    .join('');
  let tmp = '';
  for (let i = 0; i < Math.ceil(num.length / 6); i++) {
    tmp = (parseInt(tmp + num.substring(i * 6, i * 6 + 6), 10) % 97).toString();
  }
  return parseInt(tmp, 10);
}

function checksumOk(compact: string): boolean {
  return ibanCheck(compact.substring(4) + compact.substring(0, 4)) === 1;
}

function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += NIMIQ_BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += NIMIQ_BASE32[(value << (5 - bits)) & 31];
  return out;
}

/** Nimiq address = first 20 bytes of Blake2b-256(publicKey), base32 + IBAN checksum. */
export function addressFromPublicKey(publicKey: Uint8Array): string {
  if (publicKey.length !== 32) throw new Error('INVALID_PUBLIC_KEY');
  const hash = blake2b(publicKey, { dkLen: 32 }).slice(0, 20);
  const base32 = base32Encode(hash);
  const check = ('00' + (98 - ibanCheck(base32 + 'NQ00'))).slice(-2);
  return normalizeAddress('NQ' + check + base32);
}
