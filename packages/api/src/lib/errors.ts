export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'WALLET_UNAVAILABLE'
  | 'PRICE_STALE'
  | 'INTENT_EXPIRED'
  | 'AMOUNT_TOO_LOW'
  | 'TX_NOT_FOUND'
  | 'TX_WRONG_RECIPIENT'
  | 'TX_WRONG_SENDER'
  | 'TX_NO_INTENT'
  | 'ALREADY_STAMPED'
  | 'VELOCITY_LIMIT'
  | 'DEVICE_LIMIT'
  | 'NOT_ENOUGH_STAMPS'
  | 'REDEMPTION_ACTIVE'
  | 'RPC_DOWN'
  | 'SIGNATURE_INVALID'
  | 'CHALLENGE_EXPIRED'
  | 'MERCHANT_EXISTS'
  | 'NO_MERCHANT'
  | 'INTERNAL';

const STATUS: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  WALLET_UNAVAILABLE: 400,
  PRICE_STALE: 503,
  INTENT_EXPIRED: 410,
  AMOUNT_TOO_LOW: 422,
  TX_NOT_FOUND: 404,
  TX_WRONG_RECIPIENT: 422,
  TX_WRONG_SENDER: 422,
  TX_NO_INTENT: 422,
  ALREADY_STAMPED: 409,
  VELOCITY_LIMIT: 429,
  DEVICE_LIMIT: 403,
  NOT_ENOUGH_STAMPS: 422,
  REDEMPTION_ACTIVE: 409,
  RPC_DOWN: 503,
  SIGNATURE_INVALID: 401,
  CHALLENGE_EXPIRED: 410,
  MERCHANT_EXISTS: 409,
  NO_MERCHANT: 404,
  INTERNAL: 500,
};

const MESSAGES: Record<ErrorCode, string> = {
  BAD_REQUEST: 'Invalid request.',
  UNAUTHORIZED: 'Please sign in again.',
  NOT_FOUND: 'Not found.',
  RATE_LIMITED: 'Too many requests. Please slow down.',
  WALLET_UNAVAILABLE: 'This page needs the Nimiq Pay app.',
  PRICE_STALE: 'Prices are updating. Try again in a minute.',
  INTENT_EXPIRED: 'This payment request expired. Start a new one.',
  AMOUNT_TOO_LOW: 'That payment was below the minimum for a stamp.',
  TX_NOT_FOUND: "We can't find that transaction yet. Wait a minute and try again.",
  TX_WRONG_RECIPIENT: "That payment didn't go to this business.",
  TX_WRONG_SENDER: 'That payment was not sent from your wallet.',
  TX_NO_INTENT: 'No payment request matches that transaction. Tap Pay on the card first.',
  ALREADY_STAMPED: 'That payment already earned a stamp.',
  VELOCITY_LIMIT: "You earned a stamp less than 10 minutes ago. This payment won't earn another.",
  DEVICE_LIMIT: 'This phone already has the maximum cards for this business.',
  NOT_ENOUGH_STAMPS: 'Collect all stamps to redeem.',
  REDEMPTION_ACTIVE: 'You already have a redemption code open.',
  RPC_DOWN: "Nimiq network check is temporarily unavailable. Your stamp will appear automatically once it's back.",
  SIGNATURE_INVALID: "Signature couldn't be verified. Please try again.",
  CHALLENGE_EXPIRED: 'This sign-in request expired. Please try again.',
  MERCHANT_EXISTS: 'This wallet already has a business card.',
  NO_MERCHANT: 'No business found for this wallet yet.',
  INTERNAL: 'Something went wrong. Please try again.',
};

export class ApiError extends Error {
  readonly status: number;
  constructor(
    readonly code: ErrorCode,
    message?: string,
    readonly extra?: Record<string, unknown>,
  ) {
    super(message ?? MESSAGES[code]);
    this.status = STATUS[code];
  }
  toJSON() {
    return { error: { code: this.code, message: this.message, ...(this.extra ?? {}) } };
  }
}
