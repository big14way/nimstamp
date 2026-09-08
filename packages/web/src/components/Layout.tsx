import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { store } from '../lib/storage';
import { Icon } from './ui';

/** Punched-hole mark: a panel-blue disc with the paper showing through the punch. */
export function Mark({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect width="24" height="24" rx="5" fill="currentColor" />
      <circle cx="12" cy="12" r="5.5" fill="var(--color-paper)" />
      <circle cx="12" cy="12" r="2.2" fill="currentColor" />
    </svg>
  );
}

export function Wordmark({ size = 'md', onPanel = false }: { size?: 'sm' | 'md' | 'lg'; onPanel?: boolean }) {
  const px = size === 'lg' ? 44 : size === 'sm' ? 24 : 30;
  return (
    <span className={`inline-flex items-center gap-2 ${onPanel ? 'text-white' : 'text-ink'}`}>
      <Mark size={px} className={onPanel ? 'text-white' : 'text-panel'} />
      <span className={`t-display ${size === 'lg' ? 'text-[2.5rem]' : size === 'sm' ? 'text-[1.25rem]' : 'text-[1.6rem]'}`}>NimStamp</span>
    </span>
  );
}

export function Layout({ children, footer = true, back }: { children: ReactNode; footer?: boolean; back?: string }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-1">
          {back ? (
            <button type="button" onClick={() => (window.history.length > 1 ? nav(-1) : nav(back))} aria-label={t('common.back')} className="-ml-2 flex h-11 w-11 items-center justify-center text-ink hover:bg-paper-deep">
              <Icon.Back />
            </button>
          ) : null}
          <Link to="/" aria-label={t('nav.home')} className="flex min-h-11 items-center">
            <Wordmark size="sm" />
          </Link>
        </div>
        <button
          type="button"
          onClick={() => {
            store.role.clear();
            nav('/');
          }}
          className="t-label min-h-11 text-ink-soft underline-offset-4 hover:underline"
        >
          {t('nav.switchRole')}
        </button>
      </header>
      <main className="flex flex-1 flex-col px-4">{children}</main>
      {footer ? (
        <footer className="t-label flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-4 py-7 text-ink-soft">
          <span className="normal-case tracking-normal">{t('app.runsInside')}</span>
          <Link to="/stats" className="underline-offset-4 hover:underline">{t('nav.stats')}</Link>
          <Link to="/privacy" className="underline-offset-4 hover:underline">{t('nav.privacy')}</Link>
          <a href="https://github.com/big14way/nimstamp" target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">GitHub</a>
        </footer>
      ) : null}
    </div>
  );
}
