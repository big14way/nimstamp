import { ApiError } from '../api/client';
import { isWalletError } from '../wallet';

/** Map any thrown value to an i18n error code key under `errors.*`. */
export function errorCode(e: unknown): string {
  if (e instanceof ApiError) return e.code;
  if (isWalletError(e)) {
    return { unavailable: 'WALLET_UNAVAILABLE', rejected: 'WALLET_REJECTED', unsupported: 'WALLET_UNSUPPORTED', network: 'NETWORK', unknown: 'WALLET_UNKNOWN' }[e.code];
  }
  return 'INTERNAL';
}
