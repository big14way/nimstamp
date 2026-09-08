const APP = (import.meta.env.VITE_APP_URL ?? window.location.origin).replace(/\/$/, '');
const HOST = APP.replace(/^https?:\/\//, '');
const EXPLORER = import.meta.env.VITE_EXPLORER_TX_URL ?? 'https://nimiq.watch/#';
/** 'interstitial' = https://nimpay.app/miniapps/open/… (only works once the app is listed in nimiq/awesome); 'scheme' = nimiqpay://miniapp?url=… (works for any URL, needs Nimiq Pay installed). */
const MODE: 'interstitial' | 'scheme' = import.meta.env.VITE_DEEPLINK_MODE === 'scheme' ? 'scheme' : 'interstitial';
const full = (path: string) => `${APP}${path.startsWith('/') ? path : `/${path}`}`;

export const links = {
  app: APP,
  card: (cardId: string) => `${APP}/c/${cardId}`,
  /** Link that opens the path inside Nimiq Pay (mode chosen by VITE_DEEPLINK_MODE) — used on QR codes and printed material */
  deepLink: (path: string) => (MODE === 'scheme' ? links.schemeLink(path) : links.interstitialLink(path)),
  interstitialLink: (path: string) => `https://nimpay.app/miniapps/open/${HOST}${path.startsWith('/') ? path : `/${path}`}`,
  schemeLink: (path: string) => `nimiqpay://miniapp?url=${encodeURIComponent(full(path))}`,
  tx: (hash: string) => `${EXPLORER}${hash}`,
  openHere: () => links.deepLink(`${window.location.pathname}${window.location.search}`),
};
