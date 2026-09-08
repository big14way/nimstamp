export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim().replace(/^0x/i, '');
  if (clean.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(clean)) throw new Error('invalid hex');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function utf8ToBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

export function bytesToUtf8(b: Uint8Array): string {
  return new TextDecoder('utf-8').decode(b);
}

export function isHex(s: string): boolean {
  return s.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(s);
}

/** Accept hex, base64 or a JSON byte array, as returned by the native bridge. */
export function coerceBytes(v: unknown): Uint8Array {
  if (v instanceof Uint8Array) return v;
  if (Array.isArray(v) && v.every((x) => typeof x === 'number')) return new Uint8Array(v as number[]);
  if (typeof v === 'string') {
    const t = v.trim();
    if (isHex(t)) return hexToBytes(t);
    const bin = atob(t);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  throw new Error('unsupported byte encoding');
}
