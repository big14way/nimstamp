/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_API_BASE: string;
  readonly VITE_WALLET?: 'nimiqpay' | 'mock';
  readonly VITE_APP_URL?: string;
  readonly VITE_EXPLORER_TX_URL?: string;
  readonly VITE_MEMO_ENCODING?: 'text' | 'hex';
  readonly VITE_DEEPLINK_MODE?: 'interstitial' | 'scheme';
}
