import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { api, type Stats as StatsT } from '../api/client';
import { Layout } from '../components/Layout';
import { Card, EmptyState, ErrorState, Skeleton } from '../components/ui';
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
      <h1 className="pt-2 text-2xl font-bold">{t('stats.title')}</h1>
      <p className="mt-1 text-sm text-ink-soft">{t('stats.intro')}</p>
      {error ? <div className="mt-4"><ErrorState message={t(`errors.${error}`, { defaultValue: t('common.unknownError') })} onRetry={load} /></div> : null}
      {!s && !error ? <div className="mt-4 space-y-3"><Skeleton className="h-20 w-full" /><Skeleton className="h-40 w-full" /></div> : null}
      {s ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[
              [t('stats.merchants'), s.merchants],
              [t('stats.customers'), s.customers],
              [t('stats.stamps'), s.stamps],
              [t('stats.redemptions'), s.redemptions],
            ].map(([label, n]) => (
              <Card key={String(label)} className="p-4 text-center"><p className="text-3xl font-bold">{n}</p><p className="text-xs text-ink-soft">{label}</p></Card>
            ))}
          </div>
          <h2 className="mt-6 mb-2 font-semibold">{t('stats.merchantList')}</h2>
          {s.merchantList.length === 0 ? <EmptyState title={t('stats.empty')} /> : (
            <Card className="p-0">
              <ul className="divide-y divide-line">
                {s.merchantList.map((m) => (
                  <li key={m.cardId} className="flex items-center justify-between px-4 py-3 text-sm">
                    <span><span className="font-medium">{m.name}</span>{m.city ? <span className="text-ink-soft"> · {m.city}</span> : null}</span>
                    <Link to={`/c/${m.cardId}`} className="text-xs underline">{m.cardId}</Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <h2 className="mt-6 mb-2 font-semibold">{t('stats.recent')}</h2>
          {s.recent.length === 0 ? <EmptyState title={t('stats.empty')} /> : (
            <Card className="mb-8 p-0">
              <ul className="divide-y divide-line">
                {s.recent.map((r, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <div>
                      <p><span className={`mr-2 rounded-full px-2 py-0.5 text-xs font-semibold ${r.type === 'stamp' ? 'bg-accent/30' : 'bg-ok/15 text-ok'}`}>{r.type === 'stamp' ? t('stats.stamp') : t('stats.redemption')}</span>{r.customer} {t('stats.at')} <span className="font-medium">{r.merchantName}</span></p>
                      <p className="text-xs text-ink-soft">{timeAgo(r.at, i18n.language)}</p>
                    </div>
                    {r.txHash ? <a href={links.tx(r.txHash)} target="_blank" rel="noreferrer" className="shrink-0 font-mono text-xs underline">{shortHash(r.txHash)}</a> : null}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      ) : null}
    </Layout>
  );
}
