import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Wordmark } from '../components/Layout';
import { ErrorState, Icon, Skeleton, useCountdown } from '../components/ui';
import { errorCode } from '../lib/errors';
import { mmss } from '../lib/format';

type R = Awaited<ReturnType<typeof api.redemption>>;

/** The scratch panel: full ultramarine ground, a white PIN box whose silver strip wipes away to reveal the code. */
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
    <div className={`flex min-h-dvh flex-col ${expired ? 'bg-paper text-ink' : 'bg-panel text-white'}`}>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-4">
        <div className="flex items-center justify-between">
          <Wordmark size="sm" onPanel={!expired} />
          <Link to={back} className={`t-label min-h-11 inline-flex items-center underline-offset-4 hover:underline ${expired ? 'text-ink' : 'text-panel-tint'}`}>{t('redeem.backToCard')}</Link>
        </div>
        <div className="flex flex-1 flex-col justify-center py-8">
          {error ? (
            <ErrorState message={t(`errors.${error}`, { defaultValue: t('common.unknownError') })} onRetry={load} />
          ) : !r ? (
            <div className="space-y-3"><Skeleton className="h-10 w-2/3 bg-white/30" /><Skeleton className="h-40 w-full bg-white/30" /></div>
          ) : (
            <>
              <h1 className="t-display text-[2.5rem]">{r.merchantName}</h1>
              <p className={`mt-2 text-xl font-bold ${expired ? 'text-ink-soft' : 'text-panel-tint'}`}>{r.rewardText}</p>

              {expired ? (
                <p className="mt-10 border-2 border-ink px-4 py-4 font-bold">{t('redeem.expired')}</p>
              ) : (
                <div className="mt-10 bg-white text-ink">
                  <div className="flex items-center justify-between px-5 pt-4">
                    <span className="t-label text-ink-soft">{t('redeem.code')}</span>
                    {r.status === 'confirmed' ? (
                      <span className="t-label inline-flex items-center gap-1 text-ok"><Icon.Check className="h-4 w-4" />{t('redeem.confirmed')}</span>
                    ) : (
                      <span className="t-label t-num inline-flex items-center gap-1 text-ink-soft"><Icon.Clock className="h-4 w-4" />{t('redeem.expiresIn', { time: mmss(left) })}</span>
                    )}
                  </div>
                  <div className="scratch mx-5 mt-3 mb-5 border-2 border-ink">
                    <p className="t-display t-num px-3 py-4 text-center text-[5.5rem] leading-none tracking-[0.12em]" aria-live="polite">{r.code}</p>
                  </div>
                  <div className="perf perf-in-panel" aria-hidden="true" />
                  <p className="t-display px-5 py-4 text-center text-[1.5rem]">{t('redeem.show')}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
