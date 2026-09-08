const APP = (import.meta.env.VITE_APP_URL ?? window.location.origin).replace(/\/$/, '');
const HOST = APP.replace(/^https?:\/\//, '');
const EXPLORER = import.meta.env.VITE_EXPLORER_TX_URL ?? 'https://nimiq.watch/#';

export const links = {
  app: APP,
  card: (cardId: string) => `${APP}/c/${cardId}`,
  /** HTTPS deeplink — use this on printed material */
  deepLink: (path: string) => `https://nimpay.app/miniapps/open/${HOST}${path.startsWith('/') ? path : `/${path}`}`,
  schemeLink: (path: string) => `nimiqpay://miniapp?url=${HOST}${path.startsWith('/') ? path : `/${path}`}`,
  tx: (hash: string) => `${EXPLORER}${hash}`,
  openHere: () => `https://nimpay.app/miniapps/open/${HOST}${window.location.pathname}${window.location.search}`,
};
