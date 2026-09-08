export interface Merchant {
  id: string;
  name: string;
  city: string | null;
  address: string;
  createdAt?: number;
  status?: string;
}
export interface Card {
  id: string;
  merchantId: string;
  title: string;
  rewardText: string;
  stampsRequired: number;
  minFiatAmount: number;
  fiatCurrency: 'NGN' | 'USD' | 'EUR';
  velocityMinutes: number;
  createdAt: number;
}
export interface CustomerCard {
  id: string;
  cardId: string;
  address: string;
  stamps: number;
  lifetimeStamps: number;
  lastStampAt: number | null;
  createdAt: number;
}
export interface Intent {
  id: string;
  memo: string;
  toAddress: string;
  amountLuna: number;
  amountNim: number;
  fiatAmount: number;
  fiatCurrency: string;
  nimPriceFiat: number;
  createdAt: number;
  expiresAt: number;
  status: 'pending' | 'matched' | 'expired';
  lastError: string | null;
}
export interface Redemption {
  id: string;
  customerCardId: string;
  code: string;
  status: 'issued' | 'confirmed' | 'expired';
  issuedAt: number;
  expiresAt: number;
  confirmedAt: number | null;
  customer?: string;
}
export interface Stamp {
  id: string;
  customerCardId: string;
  txHash: string;
  amountLuna: number;
  fiatAmount: number;
  fiatCurrency: string;
  blockHeight: number;
  source: 'watcher' | 'manual_claim';
  counted: boolean;
  createdAt: number;
  customer?: string;
}
export interface PriceInfo {
  nimPriceFiat: number;
  minLuna: number;
}
export interface CardPublic {
  card: Card;
  merchant: Merchant;
  price: PriceInfo | null;
}
export interface CustomerCardState {
  customerCard: CustomerCard;
  card: Card;
  merchant: Merchant;
  pendingIntent: Intent | null;
  lastIntent: Intent | null;
  activeRedemption: Redemption | null;
  velocityBlockedUntil: number | null;
  price: PriceInfo | null;
}
export interface MerchantMe {
  merchant: Merchant;
  card: Card;
  stats: { customers: number; stamps: number; redemptions: number };
  watcher: { lastPolledAt: number | null; lastSeenHeight: number; error: string | null } | null;
  shareUrl: string;
  deepLink: string;
  schemeLink: string;
}
export interface Stats {
  merchants: number;
  customers: number;
  stamps: number;
  redemptions: number;
  merchantList: { name: string; city: string | null; cardId: string; createdAt: number }[];
  recent: { type: 'stamp' | 'redemption'; merchantName: string; customer: string; txHash?: string; at: number }[];
}

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly extra: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '');
const TOKEN_KEY = 'ns_token';

export const session = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

async function request<T>(method: string, path: string, body?: unknown, auth = false): Promise<T> {
  const headers: Record<string, string> = { accept: 'application/json' };
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (auth) {
    const t = session.get();
    if (!t) throw new ApiError('UNAUTHORIZED', 'Please sign in again.', 401);
    headers.authorization = `Bearer ${t}`;
  }
  let res: Response;
  try {
    res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError('NETWORK', 'Network error. Check your connection and try again.', 0);
  }
  if (res.status === 204 || res.status === 202) return undefined as T;
  const json = (await res.json().catch(() => ({}))) as { error?: { code: string; message: string; [k: string]: unknown } } & T;
  if (!res.ok) {
    const e = json.error ?? { code: 'INTERNAL', message: 'Something went wrong.' };
    const { code, message, ...extra } = e;
    if (res.status === 401 && auth) session.clear();
    throw new ApiError(code, message, res.status, extra);
  }
  return json as T;
}

export const api = {
  // auth
  challenge: (address: string) => request<{ nonce: string; message: string; expiresAt: number }>('POST', '/auth/challenge', { address }),
  verify: (body: { address: string; nonce: string; signature?: string; publicKey?: string; txHash?: string; handoff?: string }) =>
    request<{ token: string; merchant: Merchant | null }>('POST', '/auth/verify', body),
  logout: () => request<void>('POST', '/auth/logout', undefined, true),
  handoff: () => request<{ nonce: string; expiresAt: number; loginUrl: string; deepLink: string }>('POST', '/auth/handoff'),
  handoffSession: (nonce: string) => request<{ pending?: boolean; token?: string; merchant?: Merchant | null }>('GET', `/auth/session/${nonce}`),
  me: () => request<{ address: string; merchant: Merchant | null }>('GET', '/auth/me', undefined, true),
  // merchant
  createMerchant: (body: { name: string; city?: string; card: { title: string; rewardText: string; stampsRequired: number; minFiatAmount: number; fiatCurrency: string } }) =>
    request<{ merchant: Merchant; card: Card; shareUrl: string; deepLink: string; schemeLink: string }>('POST', '/merchants', body, true),
  merchantMe: () => request<MerchantMe>('GET', '/merchants/me', undefined, true),
  patchCard: (body: Partial<{ title: string; rewardText: string; stampsRequired: number; minFiatAmount: number; fiatCurrency: string; velocityMinutes: number }>) =>
    request<{ card: Card }>('PATCH', '/merchants/me/card', body, true),
  activity: (limit = 50) => request<{ stamps: Stamp[]; redemptions: Redemption[] }>('GET', `/merchants/me/activity?limit=${limit}`, undefined, true),
  confirmRedemption: (id: string) => request<{ redemption: Redemption }>('POST', `/merchants/me/redemptions/${id}/confirm`, {}, true),
  // customer
  card: (cardId: string) => request<CardPublic>('GET', `/cards/${cardId}`),
  customerCard: (cardId: string, body: { address: string; deviceId?: string }) => request<{ customerCard: CustomerCard; created: boolean }>('POST', `/cards/${cardId}/customer-cards`, body),
  customerCardState: (id: string, address: string) => request<CustomerCardState>('GET', `/customer-cards/${id}?address=${encodeURIComponent(address)}`),
  intent: (cardId: string, body: { customerCardId: string; address: string }) => request<{ intent: Intent; reused: boolean; velocityBlockedUntil?: number | null }>('POST', `/cards/${cardId}/intents`, body),
  notify: (intentId: string, txHash?: string | null) => request<void>('POST', '/payments/notify', { intentId, ...(txHash ? { txHash } : {}) }),
  claim: (customerCardId: string, txHash: string) => request<{ stamp: Stamp; counted: boolean; warning?: string }>('POST', '/payments/claim', { customerCardId, txHash }),
  redeemChallenge: (customerCardId: string, address: string) => request<{ nonce: string; message: string; expiresAt: number }>('POST', `/customer-cards/${customerCardId}/redemptions/challenge`, { address }),
  redeem: (customerCardId: string, body: { address: string; nonce: string; signature?: string; publicKey?: string; txHash?: string }) =>
    request<{ redemption: Redemption; reused: boolean }>('POST', `/customer-cards/${customerCardId}/redemptions`, body),
  redemption: (id: string) =>
    request<{ id: string; status: 'issued' | 'confirmed' | 'expired'; code?: string; issuedAt: number; expiresAt: number; confirmedAt: number | null; merchantName: string; rewardText: string; cardId: string; customerCardId: string }>('GET', `/redemptions/${id}`),
  // public
  stats: () => request<Stats>('GET', '/stats'),
  health: () => request<{ ok: boolean; rpc: 'ok' | 'down'; lastWatcherRun: number | null }>('GET', '/health'),
};
