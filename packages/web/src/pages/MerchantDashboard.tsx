import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api, session, type Redemption, type Stamp } from '../api/client';
import { Layout } from '../components/Layout';
import { QrCode } from '../components/QrCode';
import { Button, CopyField, EmptyState, ErrorState, Field, Icon, inputCls, Notice, Rule, Skeleton } from '../components/ui';
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
        <div className="space-y-4 py-4"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-12 w-full" /><Skeleton className="h-64 w-full" /><Skeleton className="h-40 w-full" /></div>
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

  const watcherLine = me.watcher?.error
    ? t('dash.watcherError', { error: me.watcher.error })
    : me.watcher?.lastPolledAt
      ? t('dash.watcherOk', { when: timeAgo(me.watcher.lastPolledAt, i18n.language) })
      : t('dash.watcherNever');

  return (
    <Layout>
      <div className="flex items-start justify-between gap-3 pt-2">
        <div className="min-w-0">
          <p className="t-label text-ink-soft">{card.title}</p>
          <h1 className="t-display mt-1 text-[2rem]">{merchant.name}</h1>
          {merchant.city ? <p className="text-sm text-ink-soft">{merchant.city}</p> : null}
        </div>
        <button type="button" onClick={() => void logout()} className="t-label min-h-11 shrink-0 text-ink-soft underline-offset-4 hover:underline">{t('nav.logout')}</button>
      </div>

      {/* till-roll totals: one ruled ledger line, tabular */}
      <dl className="t-num mt-5 grid grid-cols-3 divide-x-2 divide-ink border-y-2 border-ink">
        {[
          [t('dash.customers'), stats.customers],
          [t('dash.stamps'), stats.stamps],
          [t('dash.redemptions'), stats.redemptions],
        ].map(([label, n]) => (
          <div key={String(label)} className="px-3 py-3">
            <dt className="t-label text-ink-soft">{label}</dt>
            <dd className="t-display mt-0.5 text-[2rem] leading-none">{n}</dd>
          </div>
        ))}
      </dl>
      <p className={`t-num mt-2 flex items-center gap-1.5 text-xs ${me.watcher?.error ? 'text-alert' : 'text-ink-soft'}`}><Icon.Clock className="h-3.5 w-3.5" />{watcherLine}</p>

      <section className="mt-8">
        <Rule>{t('dash.shareTitle')}</Rule>
        <p className="mt-3 text-sm text-ink-soft">{t('dash.shareHint')}</p>
        <div className="mt-4 space-y-4">
          <CopyField label={t('dash.link')} value={shareUrl} />
          <CopyField label={t('dash.deepLink')} value={deepLink} />
        </div>
        <div className="mt-5 flex items-center gap-4 border-2 border-ink p-3">
          <QrCode value={deepLink} size={128} className="shrink-0" />
          <div className="min-w-0">
            <p className="t-label text-ink-soft">{t('dash.tableTentHint')}</p>
            <Button variant="ink" onClick={() => void downloadTent()} busy={tentBusy} className="mt-3 min-h-11 text-[1rem]">
              <Icon.Down className="h-4 w-4" />{t('dash.tableTent')}
            </Button>
          </div>
        </div>
        <p className="mt-3 text-xs text-ink-soft">{t('connecting.unlistedNote')}</p>
        <p className="t-num mt-3 text-xs text-ink-soft"><span className="t-label">{t('dash.address')}</span><br /><span className="font-mono text-ink">{merchant.address}</span></p>
      </section>

      <section className="mt-8">
        <div className="flex items-center gap-3">
          <Rule className="flex-1">{t('dash.editCard')}</Rule>
          {!editing ? <button type="button" onClick={() => setEditing(true)} className="t-label min-h-11 text-ink underline underline-offset-4">{t('common.edit')}</button> : null}
        </div>
        <p className="mt-2 text-xs text-ink-soft">{t('dash.editHint')}</p>
        {saved ? <div className="mt-3"><Notice tone="ok">{t('dash.saved')}</Notice></div> : null}
        {editing ? (
          <form onSubmit={save} className="mt-4 space-y-4">
            <Field label={t('setup.cardTitle')}><input name="title" defaultValue={card.title} required minLength={2} maxLength={40} className={inputCls} /></Field>
            <Field label={t('setup.rewardText')}><input name="rewardText" defaultValue={card.rewardText} required minLength={2} maxLength={80} className={inputCls} /></Field>
            <Field label={t('setup.stampsRequired')}><input name="stampsRequired" type="number" min={2} max={20} defaultValue={card.stampsRequired} required className={`${inputCls} t-num`} /></Field>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Field label={t('setup.minPurchase')}><input name="minFiatAmount" type="number" inputMode="decimal" min={0.01} step="any" defaultValue={card.minFiatAmount} required className={`${inputCls} t-num`} /></Field>
              <Field label={t('setup.currency')}>
                <select name="fiatCurrency" defaultValue={card.fiatCurrency} className={`${inputCls} w-24`}><option value="NGN">NGN</option><option value="USD">USD</option><option value="EUR">EUR</option></select>
              </Field>
            </div>
            <Field label={t('dash.velocity')}><input name="velocityMinutes" type="number" min={10} max={60} defaultValue={card.velocityMinutes} required className={`${inputCls} t-num`} /></Field>
            {saveError ? <ErrorState message={t(`errors.${saveError}`, { defaultValue: t('common.unknownError') })} /> : null}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" type="button" onClick={() => setEditing(false)}>{t('common.cancel')}</Button>
              <Button type="submit" busy={saveBusy}>{saveBusy ? t('common.saving') : t('common.save')}</Button>
            </div>
          </form>
        ) : (
          <dl className="t-num mt-3 divide-y divide-rule text-sm">
            {[
              [t('setup.rewardText'), card.rewardText],
              [t('setup.stampsRequired'), card.stampsRequired],
              [t('setup.minPurchase'), fiat(card.minFiatAmount, card.fiatCurrency, i18n.language)],
              [t('dash.velocity'), card.velocityMinutes],
            ].map(([k, v]) => (
              <div key={String(k)} className="flex items-baseline justify-between gap-4 py-2">
                <dt className="text-ink-soft">{k}</dt>
                <dd className="text-right font-bold">{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section className="mt-8 pb-10">
        <Rule>{t('dash.activity')}</Rule>
        <div className="mt-4 space-y-6">
          {actError ? <ErrorState message={t(`errors.${actError}`, { defaultValue: t('common.unknownError') })} onRetry={loadActivity} /> : null}
          {!activity && !actError ? <Skeleton className="h-32 w-full" /> : null}
          {activity && activity.stamps.length === 0 && activity.redemptions.length === 0 ? (
            <EmptyState title={t('dash.noActivity')}>
              <Link to={`/c/${card.id}`} className="t-label text-ink underline underline-offset-4">{t('card.share')}</Link>
            </EmptyState>
          ) : null}
          {activity && activity.redemptions.length > 0 ? (
            <div>
              <p className="t-label text-ink-soft">{t('dash.redemptionsList')}</p>
              <ul className="mt-2 divide-y-2 divide-rule border-y-2 border-ink">
                {activity.redemptions.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="t-display t-num text-[1.75rem] leading-none tracking-[0.12em]">{r.code}</p>
                      <p className="t-num mt-1 text-xs text-ink-soft">{r.customer} · {timeAgo(r.issuedAt, i18n.language)}</p>
                    </div>
                    {r.status === 'issued' ? (
                      <Button variant="ink" className="w-auto min-h-11 px-4 text-[1rem]" onClick={() => void confirm(r.id)} busy={confirming === r.id}>{t('dash.confirmRedemption')}</Button>
                    ) : (
                      <span className={`t-label ${r.status === 'confirmed' ? 'text-ok' : 'text-ink-faint'}`}>{r.status === 'confirmed' ? t('dash.confirmed') : t('dash.expired')}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {activity && activity.stamps.length > 0 ? (
            <div>
              <p className="t-label text-ink-soft">{t('dash.stampsList')}</p>
              <ul className="mt-2 divide-y divide-rule border-y-2 border-ink">
                {activity.stamps.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="t-num font-bold">{s.customer}{!s.counted ? <span className="ml-2 text-xs font-medium text-ink-soft">({t('dash.notCounted')})</span> : null}</p>
                      <p className="t-num text-xs text-ink-soft">{t('dash.receipt', { amount: nim(s.amountLuna, i18n.language) })} · {timeAgo(s.createdAt, i18n.language)}</p>
                    </div>
                    <a href={links.tx(s.txHash)} target="_blank" rel="noreferrer" className="t-num inline-flex shrink-0 items-center gap-1 font-mono text-xs text-ink underline underline-offset-4"><Icon.Link className="h-3.5 w-3.5" />{shortHash(s.txHash)}</a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>
    </Layout>
  );
}
