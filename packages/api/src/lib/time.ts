export const now = () => Math.floor(Date.now() / 1000);
export const isoFromUnix = (s: number) => new Date(s * 1000).toISOString();
export const MINUTE = 60;
export const HOUR = 3600;
export const DAY = 86400;
