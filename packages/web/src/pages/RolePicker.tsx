import { useTranslation } from 'react-i18next';
import { Link, Navigate } from 'react-router-dom';
import { Logo } from '../components/Layout';
import { Card } from '../components/ui';
import { store } from '../lib/storage';

export default function RolePicker() {
  const { t } = useTranslation();
  const role = store.role.get();
  const last = store.lastCard.get();
  if (role === 'business') return <Navigate to="/m" replace />;
  if (role === 'customer' && last) return <Navigate to={`/c/${last}`} replace />;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4">
      <div className="flex flex-1 flex-col justify-center py-10">
        <div className="mb-8 text-center">
          <Logo size="lg" />
          <p className="mx-auto mt-4 max-w-xs text-base text-ink-soft">{t('app.tagline')}</p>
        </div>
        <div className="flex flex-col gap-3">
          <Link to={last ? `/c/${last}` : '/?customer=1'} onClick={() => store.role.set('customer')} className="flex min-h-20 flex-col justify-center rounded-3xl bg-accent px-6 py-4 text-ink shadow-sm transition active:scale-[0.98]">
            <span className="text-lg font-bold">{t('role.customer')}</span>
            <span className="text-sm opacity-80">{t('role.customerHint')}</span>
          </Link>
          <Link to="/m" onClick={() => store.role.set('business')} className="flex min-h-20 flex-col justify-center rounded-3xl bg-ink px-6 py-4 text-white shadow-sm transition active:scale-[0.98]">
            <span className="text-lg font-bold">{t('role.business')}</span>
            <span className="text-sm opacity-80">{t('role.businessHint')}</span>
          </Link>
        </div>
        {new URLSearchParams(window.location.search).get('customer') ? (
          <Card className="mt-4 text-sm text-ink-soft">{t('role.customerNoCard')}</Card>
        ) : null}
        <Card className="mt-6">
          <p className="mb-2 text-sm font-semibold">{t('role.howTitle')}</p>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-soft">
            <li>{t('role.how1')}</li>
            <li>{t('role.how2')}</li>
            <li>{t('role.how3')}</li>
          </ol>
        </Card>
      </div>
      <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 py-6 text-xs text-ink-soft">
        <span>{t('app.runsInside')}</span>
        <Link to="/stats" className="underline-offset-2 hover:underline">{t('nav.stats')}</Link>
        <Link to="/privacy" className="underline-offset-2 hover:underline">{t('nav.privacy')}</Link>
        <a href="https://github.com/big14way/nimstamp" target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">GitHub</a>
      </footer>
    </div>
  );
}
