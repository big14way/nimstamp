import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api, session, type Redemption, type Stamp } from '../api/client';
import { Layout } from '../components/Layout';
import { QrCode } from '../components/QrCode';
import { Banner, Button, Card, CopyField, EmptyState, ErrorState, Field, inputCls, Skeleton } from '../components/ui';
import { useMerchant } from '../hooks/useSession';
import { errorCode } from '../lib/errors';
import { fiat, nim, shortHash, timeAgo } from '../lib/format';
import { links } from '../lib/links';
import { store } from '../lib/storage';
import { renderTableTent } from '../lib/tableTent';

export default function MerchantDashboard() {
  const { t, i18n } = useTranslation();
  const nav = useNavigate();
  const { me, error, loading, reload, setMe } = useMerchant();
  const [activity, setActivity] = useState<{ stamps: Stamp[]; redemptions: Redemption[] } | null>(null);
  const [actError, setActError] = useState<string | null>(null);
  const [tentBusy, setTentBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  useEffect(() => {
    store.role.set('business');
  }, []);

  const loadActivity = useCallback(async () => {
    try {
      setActivity(await api.activity(50));
      setActError(null);
    } catch (e) {
      setActError(errorCode(e));
    }
  }, []);
  useEffect(() => {
    if (me) void loadActivity();
  }, [me, loadActivity]);
  // live-ish: refresh every 30 s while open
  useEffect(() => {
    if (!me) return;
    const id = setInterval(() => {
      void loadActivity();
      void reload();
    }, 30000);
    return () => clearInterval(id);
  }, [me, loadActivity, reload]);

  if (!session.get() || error === 'UNAUTHORIZED' || error === 'NO_MERCHANT') return <Navigate to="/m/setup" replace />;

  if (loading && !me) {
    return (
      <Layout>
        <div className="space-y-4 py-4"><Skeleton className="h-8 w-1/2" /><Skeleton className="h-40 w-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>
      </Layout>
    );
  }
  if (error || !me) {
    return (
      <Layout>
        <div className="py-6"><ErrorState message={t(`errors.${error ?? 'INTERNAL'}`, { defaultValue: t('common.unknownError') })} onRetry={reload} /></div>
      </Layout>
    );
  }

  const { merchant, card, stats } = me;
  const shareUrl = links.card(card.id);
  const deepLink = links.deepLink(`/c/${card.id}`);

  const downloadTent = async () => {
    setTentBusy(true);
    try {
      const url = await renderTableTent({
        name: merchant.name,
        headline: t('tent.headline'),
        rewardLine: t('tent.reward', { stamps: card.stampsRequired, reward: card.rewardText }),
        scanLine: t('tent.scan'),
        orLine: t('tent.or'),
        url: shareUrl,
        deepLink,
      });
      const a = document.createElement('a');
      a.href = url;
      a.download = `nimstamp-${card.id}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // WebViews may ignore download attributes: also open in a new tab as fallback
      if (/nimiq|wv|webview/i.test(navigator.userAgent)) window.open(url, '_blank');
    } finally {
      setTentBusy(false);
    }
  };

  const confirm = async (id: string) => {
    setConfirming(id);
    try {
      await api.confirmRedemption(id);
      await loadActivity();
    } catch (e) {
      setActError(errorCode(e));
    } finally {
      setConfirming(null);
    }
  };

  const logout = async () => {
    await api.logout().catch(() => undefined);
    session.clear();
    store.role.clear();
    nav('/');
  };

  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSaveBusy(true);
    setSaveError(null);
    try {
      const r = await api.patchCard({
        title: String(f.get('title')),
        rewardText: String(f.get('rewardText')),
        stampsRequired: Number(f.get('stampsRequired')),
        minFiatAmount: Number(f.get('minFiatAmount')),
        fiatCurrency: String(f.get('fiatCurrency')),
        velocityMinutes: Number(f.get('velocityMinutes')),
      });
      setMe({ ...me, card: r.card });
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setSaveError(errorCode(err));
    } finally {
      setSaveBusy(false);
    }
  };

  return (
    <Layout>
      <div className="flex items-start justify-between pt-2">
        <div>
          <h1 className="text-2xl font-bold leading-tight">{merchant.name}</h1>
          <p className="text-sm text-ink-soft">{merchant.city ? `${merchant.city} · ` : ''}{card.title}</p>
        </div>
        <button type="button" onClick={() => void logout()} className="text-xs text-ink-soft underline">{t('nav.logout')}</button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          [t('dash.customers'), stats.customers],
          [t('dash.stamps'), stats.stamps],
          [t('dash.redemptions'), stats.redemptions],
        ].map(([label, n]) => (
          <Card key={String(label)} className="p-3 text-center"><p className="text-2xl font-bold">{n}</p><p className="text-xs text-ink-soft">{label}</p></Card>
        ))}
      </div>

      <Card className="mt-4">
        <p className="font-semibold">{t('dash.shareTitle')}</p>
        <p className="mt-1 text-xs text-ink-soft">{t('dash.shareHint')}</p>
        <div className="mt-3 space-y-3">
          <CopyField label={t('dash.link')} value={shareUrl} />
          <CopyField label={t('dash.deepLink')} value={deepLink} />
        </div>
        <div className="mt-4 flex justify-center"><QrCode value={deepLink} size={180} /></div>
        <p className="mt-2 text-center text-xs text-ink-soft">{t('connecting.unlistedNote')}</p>
        <div className="mt-4">
          <Button variant="secondary" onClick={() => void downloadTent()} busy={tentBusy}>{t('dash.tableTent')}</Button>
          <p className="mt-1 text-center text-xs text-ink-soft">{t('dash.tableTentHint')}</p>
        </div>
        <p className="mt-4 text-xs text-ink-soft"><span className="font-medium">{t('dash.address')}:</span> <span className="font-mono">{merchant.address}</span></p>
        <p className="mt-2 text-xs text-ink-soft">
          {me.watcher?.error ? t('dash.watcherError', { error: me.watcher.error }) : me.watcher?.lastPolledAt ? t('dash.watcherOk', { when: timeAgo(me.watcher.lastPolledAt, i18n.language) }) : t('dash.watcherNever')}
        </p>
      </Card>

      <Card className="mt-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold">{t('dash.editCard')}</p>
          {!editing ? <button type="button" onClick={() => setEditing(true)} className="text-sm underline">{t('dash.editCard')}</button> : null}
        </div>
        <p className="mt-1 text-xs text-ink-soft">{t('dash.editHint')}</p>
        {saved ? <Banner tone="ok">{t('dash.saved')}</Banner> : null}
        {editing ? (
          <form onSubmit={save} className="mt-3 space-y-3">
            <Field label={t('setup.cardTitle')}><input name="title" defaultValue={card.title} required minLength={2} maxLength={40} className={inputCls} /></Field>
            <Field label={t('setup.rewardText')}><input name="rewardText" defaultValue={card.rewardText} required minLength={2} maxLength={80} className={inputCls} /></Field>
            <Field label={t('setup.stampsRequired')}><input name="stampsRequired" type="number" min={2} max={20} defaultValue={card.stampsRequired} required className={inputCls} /></Field>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Field label={t('setup.minPurchase')}><input name="minFiatAmount" type="number" inputMode="decimal" min={0.01} step="any" defaultValue={card.minFiatAmount} required className={inputCls} /></Field>
              <Field label={t('setup.currency')}>
                <select name="fiatCurrency" defaultValue={card.fiatCurrency} className={`${inputCls} w-24`}><option value="NGN">NGN</option><option value="USD">USD</option><option value="EUR">EUR</option></select>
              </Field>
            </div>
            <Field label={t('dash.velocity')}><input name="velocityMinutes" type="number" min={10} max={60} defaultValue={card.velocityMinutes} required className={inputCls} /></Field>
            {saveError ? <ErrorState message={t(`errors.${saveError}`, { defaultValue: t('common.unknownError') })} /> : null}
            <div className="flex gap-2">
              <Button variant="ghost" type="button" onClick={() => setEditing(false)}>{t('common.cancel')}</Button>
              <Button type="submit" busy={saveBusy}>{saveBusy ? t('common.saving') : t('common.save')}</Button>
            </div>
          </form>
        ) : (
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
            <dt className="text-ink-soft">{t('setup.rewardText')}</dt><dd>{card.rewardText}</dd>
            <dt className="text-ink-soft">{t('setup.stampsRequired')}</dt><dd>{card.stampsRequired}</dd>
            <dt className="text-ink-soft">{t('setup.minPurchase')}</dt><dd>{fiat(card.minFiatAmount, card.fiatCurrency, i18n.language)}</dd>
            <dt className="text-ink-soft">{t('dash.velocity')}</dt><dd>{card.velocityMinutes}</dd>
          </dl>
        )}
      </Card>

      <section className="mt-4 pb-8">
        <h2 className="mb-2 font-semibold">{t('dash.activity')}</h2>
        {actError ? <ErrorState message={t(`errors.${actError}`, { defaultValue: t('common.unknownError') })} onRetry={loadActivity} /> : null}
        {!activity && !actError ? <Skeleton className="h-32 w-full" /> : null}
        {activity && activity.stamps.length === 0 && activity.redemptions.length === 0 ? (
          <EmptyState title={t('dash.noActivity')}>
            <Link to={`/c/${card.id}`} className="text-sm underline">{t('card.share')}</Link>
          </EmptyState>
        ) : null}
        {activity && activity.redemptions.length > 0 ? (
          <Card className="mb-3 p-0">
            <p className="px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">{t('dash.redemptionsList')}</p>
            <ul className="divide-y divide-line">
              {activity.redemptions.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div>
                    <p className="font-mono text-lg font-bold tracking-widest">{r.code}</p>
                    <p className="text-xs text-ink-soft">{r.customer} · {timeAgo(r.issuedAt, i18n.language)}</p>
                  </div>
                  {r.status === 'issued' ? (
                    <Button variant="secondary" className="w-auto min-h-10 px-3 text-xs" onClick={() => void confirm(r.id)} busy={confirming === r.id}>{t('dash.confirmRedemption')}</Button>
                  ) : (
                    <span className={`rounded-full px-2 py-1 text-xs ${r.status === 'confirmed' ? 'bg-ok/10 text-ok' : 'bg-line text-ink-soft'}`}>{r.status === 'confirmed' ? t('dash.confirmed') : t('dash.expired')}</span>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
        {activity && activity.stamps.length > 0 ? (
          <Card className="p-0">
            <p className="px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">{t('dash.stampsList')}</p>
            <ul className="divide-y divide-line">
              {activity.stamps.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium">{s.customer}{!s.counted ? <span className="ml-2 text-xs text-ink-soft">({t('dash.notCounted')})</span> : null}</p>
                    <p className="text-xs text-ink-soft">{t('dash.receipt', { amount: nim(s.amountLuna, i18n.language) })} · {timeAgo(s.createdAt, i18n.language)}</p>
                  </div>
                  <a href={links.tx(s.txHash)} target="_blank" rel="noreferrer" className="shrink-0 font-mono text-xs underline">{shortHash(s.txHash)}</a>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </section>
    </Layout>
  );
}
