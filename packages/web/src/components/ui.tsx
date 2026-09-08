import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
const styles: Record<Variant, string> = {
  primary: 'bg-accent text-ink hover:bg-accent-dark active:scale-[0.98] shadow-sm',
  secondary: 'bg-ink text-white hover:bg-[#2b3060] active:scale-[0.98]',
  ghost: 'bg-transparent text-ink border border-line hover:bg-white',
  danger: 'bg-danger text-white hover:opacity-90',
};

export function Button({ variant = 'primary', busy, className = '', children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; busy?: boolean }) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || busy}
      className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 text-base font-semibold transition disabled:opacity-50 disabled:active:scale-100 ${styles[variant]} ${className}`}
    >
      {busy ? <Spinner /> : null}
      {children}
    </button>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg className={`h-5 w-5 animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-3xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(31,35,72,0.04)] ${className}`}>{children}</section>;
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`pulse-soft rounded-xl bg-line ${className}`} aria-hidden="true" />;
}

export function ErrorState({ message, onRetry, action }: { message: string; onRetry?: () => void; action?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="rounded-2xl border border-danger/30 bg-danger/5 p-4 text-sm text-ink">
      <p className="mb-3 font-medium">{message}</p>
      <div className="flex flex-col gap-2">
        {action}
        {onRetry ? (
          <Button variant="ghost" onClick={onRetry} className="min-h-10 text-sm">
            {t('common.retry')}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function EmptyState({ title, hint, children }: { title: string; hint?: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-white/60 p-6 text-center">
      <p className="font-semibold">{title}</p>
      {hint ? <p className="mt-1 text-sm text-ink-soft">{hint}</p> : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

export function Banner({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'ok'; children: ReactNode }) {
  const cls = { info: 'bg-ink/5 text-ink', warn: 'bg-accent/20 text-ink', ok: 'bg-ok/10 text-ink' }[tone];
  return <div className={`rounded-2xl px-4 py-3 text-sm ${cls}`}>{children}</div>;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-ink-soft">{hint}</span> : null}
    </label>
  );
}

export const inputCls = 'w-full min-h-12 rounded-xl border border-line bg-white px-3 text-base text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/30';

export function CopyField({ value, label }: { value: string; label?: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div>
      {label ? <span className="mb-1 block text-xs font-medium text-ink-soft">{label}</span> : null}
      <div className="flex items-stretch gap-2">
        <input readOnly value={value} className={`${inputCls} min-h-11 flex-1 text-sm`} onFocus={(e) => e.currentTarget.select()} />
        <button type="button" onClick={copy} className="min-h-11 shrink-0 rounded-xl bg-ink px-3 text-sm font-semibold text-white">
          {copied ? t('common.copied') : t('common.copy')}
        </button>
      </div>
    </div>
  );
}

/** Ticks once a second; returns remaining seconds. */
export function useCountdown(untilUnix: number | null): number {
  const calc = () => (untilUnix ? Math.max(0, untilUnix - Math.floor(Date.now() / 1000)) : 0);
  const [left, setLeft] = useState(calc);
  useEffect(() => {
    setLeft(calc());
    if (!untilUnix) return;
    const id = setInterval(() => setLeft(calc()), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [untilUnix]);
  return left;
}
