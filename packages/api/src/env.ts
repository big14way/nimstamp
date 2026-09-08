export interface Env {
  DB: D1Database;
  NIMIQ_RPC_URL: string;
  NIMIQ_RPC_AUTH?: string;
  NIMIQ_NETWORK?: string;
  SESSION_SECRET?: string;
  ALLOWED_ORIGINS?: string;
  PRICE_SOURCE_URL?: string;
  FX_SOURCE_URL?: string;
  PRICE_API_KEY?: string;
  APP_URL?: string;
  DEMO_MODE?: string;
}

export const isDemo = (env: Env) => env.DEMO_MODE === '1';
export const appUrl = (env: Env) => (env.APP_URL ?? 'http://localhost:5173').replace(/\/$/, '');

export function cardLinks(env: Env, cardId: string) {
  const base = appUrl(env);
  const host = base.replace(/^https?:\/\//, '');
  return {
    shareUrl: `${base}/c/${cardId}`,
    deepLink: `https://nimpay.app/miniapps/open/${host}/c/${cardId}`,
    schemeLink: `nimiqpay://miniapp?url=${host}/c/${cardId}`,
  };
}
