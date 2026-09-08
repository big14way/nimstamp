/** Crockford-style base32 without vowels or 0/1 (avoids look-alikes and accidental words). */
export const ID_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function randomId(length: number, alphabet = ID_ALPHABET): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i++) out += alphabet[bytes[i]! % alphabet.length];
  return out;
}

export const newMerchantId = () => randomId(8);
export const newCardId = () => randomId(8);
export const newCustomerCardId = () => randomId(8);
export const newNonce = () => randomId(6);
export const newCode = () => randomId(4);
export const newRowId = () => randomId(12);

export function randomHex(bytes: number): string {
  const b = new Uint8Array(bytes);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}
