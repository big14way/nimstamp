import { bytesToUtf8, hexToBytes, isHex } from './hex';

export const MEMO_RE = /^NS1:([0-9A-Z]{8}):([0-9A-Z]{6})$/;
export const LOGIN_MEMO_RE = /^NSA:([0-9A-Z]{6})$/;
export const REDEEM_MEMO_RE = /^NSR:([0-9A-Z]{6})$/;

export function buildMemo(cardId: string, nonce: string): string {
  return `NS1:${cardId}:${nonce}`;
}

export interface ParsedMemo {
  cardId: string;
  nonce: string;
}

export function parseMemo(memo: string): ParsedMemo | null {
  const m = MEMO_RE.exec(memo.trim());
  return m ? { cardId: m[1]!, nonce: m[2]! } : null;
}

/**
 * The RPC returns `recipientData` as hex of the raw bytes. Nimiq Pay may store the
 * memo as UTF-8 text, or (if a host hex-encodes the `data` string) as hex-of-text.
 * Try both so matching never depends on which one the wallet did.
 */
export function decodeTxData(recipientDataHex: string): string {
  if (!recipientDataHex) return '';
  let text: string;
  try {
    text = bytesToUtf8(hexToBytes(recipientDataHex));
  } catch {
    return '';
  }
  const t = text.trim();
  if (t.length >= 2 && isHex(t)) {
    try {
      const inner = bytesToUtf8(hexToBytes(t)).trim();
      if (/^NS[1AR]:/.test(inner)) return inner;
    } catch {
      /* fall through */
    }
  }
  return t;
}
