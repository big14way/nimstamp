import { MockProvider } from './mockProvider';
import { NimiqPayProvider } from './nimiqPayProvider';
import type { WalletProvider } from './types';

export * from './types';

let instance: WalletProvider | null = null;

export function getWallet(): WalletProvider {
  if (!instance) {
    instance =
      import.meta.env.VITE_WALLET === 'mock'
        ? new MockProvider(import.meta.env.VITE_API_BASE)
        : new NimiqPayProvider(import.meta.env.VITE_MEMO_ENCODING === 'hex' ? 'hex' : 'text');
  }
  return instance;
}

export const isMockWallet = () => import.meta.env.VITE_WALLET === 'mock';
