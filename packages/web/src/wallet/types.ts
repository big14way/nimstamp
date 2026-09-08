export interface WalletProvider {
  /** true when running inside Nimiq Pay with a provider available (or the mock is enabled) */
  isAvailable(): boolean;
  /** primary NIM address in user-friendly format "NQxx xxxx ..." — prompts the user the first time */
  getAddress(): Promise<string>;
  /** stable per-device pseudonymous id (64 hex chars) — prompts once per origin */
  getDeviceId(reason: string): Promise<string>;
  /** language code from Nimiq Pay, or null */
  getLanguage(): string | null;
  /**
   * Send a NIM payment with a memo. Resolves with the transaction hash (hex) when the wallet
   * returns one; `txHash` is null if the wallet returned something else (the server still
   * matches the payment by memo through the chain watcher).
   * amountLuna: integer, 1 NIM = 100_000 luna.
   */
  sendPayment(args: { to: string; amountLuna: number; memo: string }): Promise<{ txHash: string | null }>;
  /**
   * Sign an arbitrary UTF-8 message. Returns signature + public key (hex or as returned by the wallet).
   * Throws WalletError('unsupported') if the provider cannot sign (→ Plan B).
   */
  signMessage(message: string): Promise<{ signature: string; publicKey: string; address: string }>;
}

export type WalletErrorCode = 'unavailable' | 'rejected' | 'unsupported' | 'network' | 'unknown';

export class WalletError extends Error {
  constructor(
    public code: WalletErrorCode,
    msg?: string,
  ) {
    super(msg ?? code);
    this.name = 'WalletError';
  }
}

export const isWalletError = (e: unknown): e is WalletError => e instanceof WalletError;
