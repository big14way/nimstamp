export function fiat(amount: number, currency: string, locale?: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: currency === 'NGN' ? 0 : 2 }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function nim(luna: number, locale?: string): string {
  const v = luna / 100_000;
  const digits = v >= 100 ? 0 : v >= 1 ? 2 : 4;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(v)} NIM`;
}

export function shortHash(h: string): string {
  return `${h.slice(0, 6)}…${h.slice(-4)}`;
}

export function timeAgo(unix: number, locale?: string): string {
  const diff = Math.round(Date.now() / 1000 - unix);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (diff < 60) return rtf.format(-diff, 'second');
  if (diff < 3600) return rtf.format(-Math.round(diff / 60), 'minute');
  if (diff < 86400) return rtf.format(-Math.round(diff / 3600), 'hour');
  return rtf.format(-Math.round(diff / 86400), 'day');
}

export function mmss(seconds: number): string {
  const s = Math.max(0, seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
