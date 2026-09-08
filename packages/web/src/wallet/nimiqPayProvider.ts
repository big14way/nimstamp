/**
 * Real Nimiq Pay provider. This is the ONLY file that imports `@nimiq/mini-app-sdk`
 * and the only place where the [VERIFY] items from the spec live (see docs/VERIFIED.md).
 */
import { getHostLanguage, init, requestDeviceIdentifier, type NimiqProvider } from '@nimiq/mini-app-sdk';
import { WalletError, type WalletProvider } from './types';

type ErrorResponse = { error: { type?: string; message?: string } };
const isErrorResponse = (x: unknown): x is ErrorResponse =>
  typeof x === 'object' && x !== null && 'error' in x && typeof (x as ErrorResponse).error === 'object';

function mapError(e: unknown): WalletError {
  const text = (isErrorResponse(e) ? `${e.error.type ?? ''} ${e.error.message ?? ''}` : e instanceof Error ? e.message : String(e)).toLowerCase();
  if (/cancel|abort|denied|reject|dismiss|closed|permission/.test(text)) return new WalletError('rejected', text);
  if (/not injected|not running inside|unavailable|no provider/.test(text)) return new WalletError('unavailable', text);
  if (/not supported|unsupported|unknown method|not found|not implemented/.test(text)) return new WalletError('unsupported', text);
  if (/network|timeout|consensus|offline/.test(text)) return new WalletError('network', text);
  return new WalletError('unknown', text);
}

function utf8ToHex(s: string): string {
  return Array.from(new TextEncoder().encode(s), (b) => b.toString(16).padStart(2, '0')).join('');
}

const toHexString = (v: unknown): string => {
  if (typeof v === 'string') return v;
  if (v instanceof Uint8Array) return Array.from(v, (b) => b.toString(16).padStart(2, '0')).join('');
  if (Array.isArray(v)) return Array.from(v as number[], (b) => b.toString(16).padStart(2, '0')).join('');
  return String(v);
};

export class NimiqPayProvider implements WalletProvider {
  private provider: NimiqProvider | null = null;
  private address: string | null = null;
  private readonly memoEncoding: 'text' | 'hex';

  constructor(memoEncoding: 'text' | 'hex' = 'text') {
    this.memoEncoding = memoEncoding;
  }

  isAvailable(): boolean {
    return typeof window !== 'undefined' && (!!window.nimiq || !!window.nimiqPay);
  }

  private async get(): Promise<NimiqProvider> {
    if (this.provider) return this.provider;
    try {
      // V1: waits for the host to inject window.nimiq
      this.provider = await init({ timeout: 5000 });
      return this.provider;
    } catch (e) {
      throw new WalletError('unavailable', e instanceof Error ? e.message : String(e));
    }
  }

  async getAddress(): Promise<string> {
    if (this.address) return this.address;
    const p = await this.get();
    let res: unknown;
    try {
      res = await p.listAccounts();
    } catch (e) {
      throw mapError(e);
    }
    if (isErrorResponse(res)) throw mapError(res);
    const list = res as string[];
    const first = list[0];
    if (!first) throw new WalletError('rejected', 'no accounts');
    this.address = first;
    return first;
  }

  async getDeviceId(reason: string): Promise<string> {
    try {
      // V6
      return await requestDeviceIdentifier({ reason });
    } catch (e) {
      throw mapError(e);
    }
  }

  getLanguage(): string | null {
    // V7
    return getHostLanguage() ?? null;
  }

  async sendPayment(args: { to: string; amountLuna: number; memo: string }): Promise<{ txHash: string | null }> {
    const p = await this.get();
    let res: unknown;
    try {
      // V2: value in Luna, `data` is the attached text (hex when VITE_MEMO_ENCODING=hex).
      // Do not pass validityStartHeight: a stale height from an unsynced wallet invalidates the tx.
      res = await p.sendBasicTransactionWithData({
        recipient: args.to,
        value: Math.floor(args.amountLuna),
        data: this.memoEncoding === 'hex' ? utf8ToHex(args.memo) : args.memo,
      });
    } catch (e) {
      throw mapError(e);
    }
    if (isErrorResponse(res)) throw mapError(res);
    if (typeof res !== 'string' || !res.trim()) throw new WalletError('unknown', 'empty response');
    const s = res.trim().replace(/^0x/i, '');
    // Documented return is the tx hash. If a host returns a serialized tx instead, the watcher still matches by memo.
    return { txHash: /^[0-9a-fA-F]{64}$/.test(s) ? s.toLowerCase() : null };
  }

  async signMessage(message: string): Promise<{ signature: string; publicKey: string; address: string }> {
    const p = await this.get();
    const address = await this.getAddress();
    let res: unknown;
    try {
      // V3
      res = await p.sign(message);
    } catch (e) {
      throw mapError(e);
    }
    if (isErrorResponse(res)) throw mapError(res);
    const r = res as { signature: unknown; publicKey: unknown };
    if (!r || r.signature == null || r.publicKey == null) throw new WalletError('unsupported', 'sign returned no signature');
    return { signature: toHexString(r.signature), publicKey: toHexString(r.publicKey), address };
  }
}
