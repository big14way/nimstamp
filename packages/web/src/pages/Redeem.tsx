import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Logo } from '../components/Layout';
import { ErrorState, Skeleton, useCountdown } from '../components/ui';
import { errorCode } from '../lib/errors';
import { mmss } from '../lib/format';

type R = Awaited<ReturnType<typeof api.redemption>>;

export default function Redeem() {
  const { cardId = '', id = '' } = useParams();
  const { t } = useTranslation();
  const [r, setR] = useState<R | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      setR(await api.redemption(id));
      setError(null);
    } catch (e) {
      setError(errorCode(e));
    }
  }, [id]);
  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 10000);
    return () => clearInterval(t);
  }, [load]);
  const left = useCountdown(r?.expiresAt ?? null);
  const expired = !!r && (r.status === 'expired' || (r.status === 'issued' && left <= 0));
  const back = `/c/${cardId.toUpperCase()}`;

  return (
    <div className={`flex min-h-dvh flex-col ${expired ? 'bg-paper text-ink' : 'bg-ok text-white'}`}>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-6">
        <div className="flex items-center justify-between">
          <span className={expired ? '' : 'rounded-xl bg-white/90 px-2 py-1'}><Logo size="sm" /></span>
          <Link to={back} className={`text-sm font-medium underline-offset-2 hover:underline ${expired ? 'text-ink' : 'text-white'}`}>{t('redeem.backToCard')}</Link>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          {error ? (
            <div className="w-full text-ink"><ErrorState message={t(`errors.${error}`, { defaultValue: t('common.unknownError') })} onRetry={load} /></div>
          ) : !r ? (
            <div className="w-full space-y-3"><Skeleton className="mx-auto h-8 w-1/2 bg-white/40" /><Skeleton className="mx-auto h-24 w-2/3 bg-white/40" /></div>
          ) : (
            <>
              <p className="text-sm font-medium uppercase tracking-wide opacity-80">{expired ? '' : t('redeem.title')}</p>
              <h1 className="mt-2 text-3xl font-bold">{r.merchantName}</h1>
              <p className="mt-2 text-lg">{r.rewardText}</p>
              {expired ? (
                <p className="mt-8 text-base font-semibold">{t('redeem.expired')}</p>
              ) : (
                <>
                  <p className="mt-10 text-sm opacity-80">{t('redeem.code')}</p>
                  <p className="mt-1 font-mono text-7xl font-bold tracking-[0.2em]" aria-live="polite">{r.code}</p>
                  <p className="mt-6 text-base font-medium">{t('redeem.show')}</p>
                  {r.status === 'confirmed' ? <p className="mt-2 rounded-full bg-white/20 px-3 py-1 text-sm">✓ {t('redeem.confirmed')}</p> : <p className="mt-2 text-sm opacity-80">{t('redeem.expiresIn', { time: mmss(left) })}</p>}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
