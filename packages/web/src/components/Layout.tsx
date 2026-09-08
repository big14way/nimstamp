import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { store } from '../lib/storage';

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const px = size === 'lg' ? 40 : size === 'sm' ? 22 : 28;
  return (
    <span className="inline-flex items-center gap-2 font-bold tracking-tight text-ink">
      <svg width={px} height={px} viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="14" fill="#F6B221" />
        <circle cx="32" cy="32" r="16" fill="none" stroke="#1F2348" strokeWidth="6" />
        <circle cx="32" cy="32" r="6" fill="#1F2348" />
      </svg>
      <span className={size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'text-lg'}>NimStamp</span>
    </span>
  );
}

export function Layout({ children, footer = true, back }: { children: ReactNode; footer?: boolean; back?: string }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          {back ? (
            <button type="button" onClick={() => (window.history.length > 1 ? nav(-1) : nav(back))} aria-label={t('common.back')} className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-line">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
          ) : null}
          <Link to="/" aria-label={t('nav.home')}>
            <Logo size="sm" />
          </Link>
        </div>
        <button
          type="button"
          onClick={() => {
            store.role.clear();
            nav('/');
          }}
          className="text-xs font-medium text-ink-soft underline-offset-2 hover:underline"
        >
          {t('nav.switchRole')}
        </button>
      </header>
      <main className="flex flex-1 flex-col px-4">{children}</main>
      {footer ? (
        <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-6 text-xs text-ink-soft">
          <span>{t('app.runsInside')}</span>
          <Link to="/stats" className="underline-offset-2 hover:underline">{t('nav.stats')}</Link>
          <Link to="/privacy" className="underline-offset-2 hover:underline">{t('nav.privacy')}</Link>
          <a href="https://github.com/big14way/nimstamp" target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">GitHub</a>
        </footer>
      ) : null}
    </div>
  );
}
