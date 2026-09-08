import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { api, type Stats as StatsT } from '../api/client';
import { Layout } from '../components/Layout';
import { EmptyState, ErrorState, Icon, Rule, Skeleton } from '../components/ui';
import { errorCode } from '../lib/errors';
import { shortHash, timeAgo } from '../lib/format';
import { links } from '../lib/links';

export default function Stats() {
  const { t, i18n } = useTranslation();
  const [s, setS] = useState<StatsT | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setError(null);
    try {
      setS(await api.stats());
    } catch (e) {
      setError(errorCode(e));
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Layout back="/">
      <h1 className="t-display pt-2 text-[2rem]">{t('stats.title')}</h1>
      <p className="mt-2 max-w-[40ch] text-[0.9375rem] text-ink-soft">{t('stats.intro')}</p>
      {error ? <div className="mt-5"><ErrorState message={t(`errors.${error}`, { defaultValue: t('common.unknownError') })} onRetry={load} /></div> : null}
      {!s && !error ? <div className="mt-5 space-y-3"><Skeleton className="h-20 w-full" /><Skeleton className="h-40 w-full" /></div> : null}
      {s ? (
        <>
          <dl className="t-num mt-5 grid grid-cols-2 border-2 border-ink">
            {[
              [t('stats.merchants'), s.merchants],
              [t('stats.customers'), s.customers],
              [t('stats.stamps'), s.stamps],
              [t('stats.redemptions'), s.redemptions],
            ].map(([label, n], i) => (
              <div key={String(label)} className={`px-4 py-3 ${i % 2 === 0 ? 'border-r-2 border-ink' : ''} ${i < 2 ? 'border-b-2 border-ink' : ''}`}>
                <dt className="t-label text-ink-soft">{label}</dt>
                <dd className="t-display mt-0.5 text-[2.25rem] leading-none">{n}</dd>
              </div>
            ))}
          </dl>

          <section className="mt-8">
            <Rule>{t('stats.merchantList')}</Rule>
            {s.merchantList.length === 0 ? <div className="mt-3"><EmptyState title={t('stats.empty')} /></div> : (
              <ul className="mt-3 divide-y divide-rule border-y-2 border-ink">
                {s.merchantList.map((m) => (
                  <li key={m.cardId} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="min-w-0"><span className="font-bold">{m.name}</span>{m.city ? <span className="text-ink-soft"> · {m.city}</span> : null}</span>
                    <Link to={`/c/${m.cardId}`} className="t-num shrink-0 font-mono text-xs text-ink underline underline-offset-4">Nº {m.cardId}</Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-8 pb-8">
            <Rule>{t('stats.recent')}</Rule>
            {s.recent.length === 0 ? <div className="mt-3"><EmptyState title={t('stats.empty')} /></div> : (
              <ul className="mt-3 divide-y divide-rule border-y-2 border-ink">
                {s.recent.map((r, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="t-num">
                        <span className={`t-label mr-2 ${r.type === 'stamp' ? 'text-panel' : 'text-ok'}`}>{r.type === 'stamp' ? t('stats.stamp') : t('stats.redemption')}</span>
                        {r.customer} {t('stats.at')} <span className="font-bold">{r.merchantName}</span>
                      </p>
                      <p className="t-num text-xs text-ink-soft">{timeAgo(r.at, i18n.language)}</p>
                    </div>
                    {r.txHash ? <a href={links.tx(r.txHash)} target="_blank" rel="noreferrer" className="t-num inline-flex shrink-0 items-center gap-1 font-mono text-xs text-ink underline underline-offset-4"><Icon.Link className="h-3.5 w-3.5" />{shortHash(r.txHash)}</a> : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </Layout>
  );
}
