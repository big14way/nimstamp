import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

/* ------------------------------------------------------------------ icons: one stroke, one weight */
const I = ({ d, className = '' }: { d: string; className?: string }) => (
  <svg viewBox="0 0 24 24" className={`h-5 w-5 shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);
export const Icon = {
  Back: (p: { className?: string }) => <I d="M15 18l-6-6 6-6" {...p} />,
  Check: (p: { className?: string }) => <I d="M5 12.5l4.5 4.5L19 7" {...p} />,
  Copy: (p: { className?: string }) => <I d="M9 9h10v11H9zM5 15V4h10" {...p} />,
  Alert: (p: { className?: string }) => <I d="M12 8v5m0 3.5v.5M4.5 19h15L12 5z" {...p} />,
  Info: (p: { className?: string }) => <I d="M12 16v-5m0-3.5v.5M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" {...p} />,
  Link: (p: { className?: string }) => <I d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" {...p} />,
  Down: (p: { className?: string }) => <I d="M12 4v13m0 0l-5-5m5 5l5-5M5 21h14" {...p} />,
  Clock: (p: { className?: string }) => <I d="M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" {...p} />,
  Phone: (p: { className?: string }) => <I d="M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm3 15h2" {...p} />,
};

/* ------------------------------------------------------------------ controls */
type Variant = 'ink' | 'panel' | 'outline' | 'quiet' | 'alert';
const styles: Record<Variant, string> = {
  ink: 'bg-ink text-white hover:bg-panel-deep active:translate-y-px',
  panel: 'bg-panel text-white hover:bg-panel-deep active:translate-y-px',
  outline: 'bg-white text-ink border-2 border-ink hover:bg-paper-deep active:translate-y-px',
  quiet: 'bg-transparent text-ink-soft hover:text-ink underline-offset-4 hover:underline',
  alert: 'bg-alert text-white hover:opacity-90',
};

export function Button({ variant = 'ink', busy, className = '', children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; busy?: boolean }) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || busy}
      className={`t-display inline-flex min-h-13 ${/\bw-/.test(className) ? '' : 'w-full'} items-center justify-center gap-2 rounded-slab px-5 text-[1.25rem] tracking-[0.02em] transition-[background-color,transform,opacity] duration-150 ease-out-quint disabled:cursor-not-allowed ${
        rest.disabled && !busy ? 'hatch !text-ink-faint !border-transparent' : styles[variant]
      } ${className}`}
    >
      {busy ? <Spinner /> : null}
      {children}
    </button>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg className={`h-5 w-5 animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 1-9 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------ printed sheet: paper region with a rule, never nested */
export function Sheet({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`border-2 border-ink bg-white ${className}`}>{children}</section>;
}

/** Section heading printed as a rule-bound label. */
export function Rule({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={`t-label flex items-center gap-3 text-ink-soft ${className}`}>
      <span className="shrink-0">{children}</span>
      <span className="h-px flex-1 bg-rule" aria-hidden="true" />
    </h2>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`pulse-soft bg-paper-deep ${className}`} aria-hidden="true" />;
}

export function ErrorState({ message, onRetry, action }: { message: string; onRetry?: () => void; action?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="rise flex gap-3 border-2 border-alert bg-alert-wash p-4 text-ink">
      <Icon.Alert className="mt-0.5 text-alert" />
      <div className="min-w-0 flex-1">
        <p className="font-bold leading-snug">{message}</p>
        {action || onRetry ? (
          <div className="mt-3 flex flex-col gap-2">
            {action}
            {onRetry ? (
              <button type="button" onClick={onRetry} className="t-label self-start text-ink underline underline-offset-4">
                {t('common.retry')}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function EmptyState({ title, hint, children }: { title: string; hint?: string; children?: ReactNode }) {
  return (
    <div className="border-2 border-dashed border-silver-deep px-5 py-7 text-center">
      <p className="font-bold">{title}</p>
      {hint ? <p className="mt-1 text-sm text-ink-soft">{hint}</p> : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

/** Printed notice. Tone changes the ink, never adds a thick side border. */
export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'ok'; children: ReactNode }) {
  const cls = { info: 'bg-panel-wash text-ink', warn: 'bg-paper-deep text-ink', ok: 'bg-ok-wash text-ink' }[tone];
  const icon = { info: <Icon.Info className="text-panel" />, warn: <Icon.Alert className="text-ink-soft" />, ok: <Icon.Check className="text-ok" /> }[tone];
  return (
    <div className={`rise flex gap-3 px-4 py-3 text-sm ${cls}`}>
      <span className="mt-0.5">{icon}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="t-label mb-1.5 block text-ink-soft">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-ink-soft">{hint}</span> : null}
    </label>
  );
}

export const inputCls = 'w-full min-h-12 border-2 border-ink bg-white px-3 text-base text-ink outline-none transition-[box-shadow] focus:shadow-[inset_0_0_0_2px_var(--color-panel)] focus:border-panel disabled:hatch';

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
      {label ? <span className="t-label mb-1.5 block text-ink-soft">{label}</span> : null}
      <div className="flex items-stretch">
        <input readOnly value={value} className="min-h-12 min-w-0 flex-1 border-2 border-r-0 border-ink bg-white px-3 text-sm text-ink outline-none focus:border-panel" onFocus={(e) => e.currentTarget.select()} />
        <button type="button" onClick={copy} className="t-label inline-flex min-h-12 shrink-0 items-center gap-1.5 bg-ink px-3 text-white transition-colors hover:bg-panel-deep">
          {copied ? <Icon.Check className="h-4 w-4" /> : <Icon.Copy className="h-4 w-4" />}
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

/** Fixed thumb bar: paper with a top rule, safe-area padding. */
export function ActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-10 border-t-2 border-ink bg-paper">
      <div className="mx-auto w-full max-w-md space-y-2 px-4 pt-3 safe-bottom">{children}</div>
    </div>
  );
}
