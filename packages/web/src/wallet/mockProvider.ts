/** Browser dev provider: fixed address, fake hashes, mock signatures (accepted by the API only with DEMO_MODE=1). */
import { WalletError, type WalletProvider } from './types';

const DEFAULT_ADDRESS = 'NQ45 QFUH UE4U RE7T T2ND D8GF YU27 N1XU 8XUG';
const KEY = 'ns_mock_address';

function randomHex(n: number) {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

export class MockProvider implements WalletProvider {
  constructor(private readonly apiBase: string) {
    const q = new URLSearchParams(window.location.search).get('mockAddress');
    if (q) localStorage.setItem(KEY, q);
  }
  private get address() {
    return localStorage.getItem(KEY) ?? DEFAULT_ADDRESS;
  }
  isAvailable() {
    return true;
  }
  async getAddress() {
    await new Promise((r) => setTimeout(r, 300));
    return this.address;
  }
  async getDeviceId() {
    return 'ab'.repeat(32);
  }
  getLanguage() {
    return new URLSearchParams(window.location.search).get('lang');
  }
  async sendPayment(args: { to: string; amountLuna: number; memo: string }) {
    await new Promise((r) => setTimeout(r, 600));
    if (new URLSearchParams(window.location.search).get('mockCancel') === '1') throw new WalletError('rejected', 'user cancelled');
    const txHash = randomHex(32);
    // Ask the demo API to pretend this payment landed on chain (DEMO_MODE only).
    await fetch(`${this.apiBase}/demo/pay`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ from: this.address, to: args.to, value: args.amountLuna, memo: args.memo, hash: txHash }),
    }).catch(() => undefined);
    return { txHash };
  }
  async signMessage() {
    await new Promise((r) => setTimeout(r, 300));
    return { signature: `mock:${this.address}`, publicKey: 'mock', address: this.address };
  }
}
