import { useTranslation } from 'react-i18next';
import { Link, Navigate } from 'react-router-dom';
import { Wordmark } from '../components/Layout';
import { Icon, Notice } from '../components/ui';
import { store } from '../lib/storage';

export default function RolePicker() {
  const { t } = useTranslation();
  const role = store.role.get();
  const last = store.lastCard.get();
  if (role === 'business') return <Navigate to="/m" replace />;
  if (role === 'customer' && last) return <Navigate to={`/c/${last}`} replace />;
  const noCard = new URLSearchParams(window.location.search).get('customer');

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4">
      <div className="flex flex-1 flex-col justify-center py-10">
        <Wordmark size="lg" />
        <p className="mt-4 max-w-[34ch] text-[1.125rem] leading-snug text-ink-soft">{t('app.tagline')}</p>

        <div className="mt-8 flex flex-col gap-3">
          <Link to={last ? `/c/${last}` : '/?customer=1'} onClick={() => store.role.set('customer')} className="group flex min-h-24 items-center justify-between bg-panel px-5 py-4 text-white transition-[background-color,transform] duration-150 ease-out-quint hover:bg-panel-deep active:translate-y-px">
            <span>
              <span className="t-display block text-[1.75rem]">{t('role.customer')}</span>
              <span className="mt-1 block text-sm text-panel-tint">{t('role.customerHint')}</span>
            </span>
            <Icon.Back className="h-7 w-7 rotate-180 transition-transform duration-150 group-hover:translate-x-1" />
          </Link>
          <Link to="/m" onClick={() => store.role.set('business')} className="group flex min-h-24 items-center justify-between border-2 border-ink bg-white px-5 py-4 text-ink transition-[background-color,transform] duration-150 ease-out-quint hover:bg-paper-deep active:translate-y-px">
            <span>
              <span className="t-display block text-[1.75rem]">{t('role.business')}</span>
              <span className="mt-1 block text-sm text-ink-soft">{t('role.businessHint')}</span>
            </span>
            <Icon.Back className="h-7 w-7 rotate-180 transition-transform duration-150 group-hover:translate-x-1" />
          </Link>
        </div>

        {noCard ? <div className="mt-4"><Notice tone="info">{t('role.customerNoCard')}</Notice></div> : null}

        <div className="mt-8 border-t-2 border-ink pt-4">
          <p className="t-label text-ink-soft">{t('role.howTitle')}</p>
          <ol className="t-num mt-3 space-y-2">
            {[t('role.how1'), t('role.how2'), t('role.how3')].map((line, i) => (
              <li key={i} className="flex gap-3 text-[0.9375rem] leading-snug">
                <span className="t-display w-6 shrink-0 text-[1.5rem] leading-none text-panel">{i + 1}</span>
                <span className="pt-0.5">{line}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <footer className="t-label flex flex-wrap items-center justify-center gap-x-5 gap-y-2 py-7 text-ink-soft">
        <span className="normal-case tracking-normal">{t('app.runsInside')}</span>
        <Link to="/stats" className="underline-offset-4 hover:underline">{t('nav.stats')}</Link>
        <Link to="/privacy" className="underline-offset-4 hover:underline">{t('nav.privacy')}</Link>
        <a href="https://github.com/big14way/nimstamp" target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">GitHub</a>
      </footer>
    </div>
  );
}
