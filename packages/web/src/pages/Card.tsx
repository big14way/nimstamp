import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError, type CardPublic, type CustomerCardState } from '../api/client';
import { Layout } from '../components/Layout';
import { StampGrid } from '../components/StampGrid';
import { Banner, Button, Card, ErrorState, Skeleton, useCountdown } from '../components/ui';
import { useWalletAvailable } from '../hooks/useWalletAvailable';
import { errorCode } from '../lib/errors';
import { fiat, mmss, nim } from '../lib/format';
import { links } from '../lib/links';
import { store } from '../lib/storage';
import { getWallet, isWalletError } from '../wallet';

type Phase = 'idle' | 'connecting' | 'creatingIntent' | 'paying' | 'waiting' | 'redeeming';
const POLL_MS = 3000;
const WAIT_MAX_S = 90;

export default function CardPage() {
  const { cardId = '' } = useParams();
  const { t, i18n } = useTranslation();
  const nav = useNavigate();
  const wallet = getWallet();
  const available = useWalletAvailable();

  const [pub, setPub] = useState<CardPublic | null>(null);
  const [pubError, setPubError] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(store.address.get());
  const [state, setState] = useState<CustomerCardState | null>(null);
  const [stateError, setStateError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [earned, setEarned] = useState(false);
  const [waitStart, setWaitStart] = useState<number | null>(null);
  const [slowHint, setSlowHint] = useState(false);
  const [askVelocity, setAskVelocity] = useState<number | null>(null);
  const stampsRef = useRef<number>(-1);

  const id = cardId.toUpperCase();

  const loadPub = useCallback(async () => {
    setPubError(null);
    try {
      setPub(await api.card(id));
    } catch (e) {
      setPubError(errorCode(e));
    }
  }, [id]);

  const loadState = useCallback(
    async (addr: string) => {
      let ccId = store.customerCard.get(id);
      try {
        if (!ccId) {
          const r = await api.customerCard(id, { address: addr });
          ccId = r.customerCard.id;
          store.customerCard.set(id, ccId);
        }
        const s = await api.customerCardState(ccId, addr);
        setState(s);
        setStateError(null);
        return s;
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) {
          // stale local id → recreate
          try {
            const r = await api.customerCard(id, { address: addr });
            store.customerCard.set(id, r.customerCard.id);
            const s = await api.customerCardState(r.customerCard.id, addr);
            setState(s);
            setStateError(null);
            return s;
          } catch (e2) {
            setStateError(errorCode(e2));
          }
        } else setStateError(errorCode(e));
        return null;
      }
    },
    [id],
  );

  useEffect(() => {
    store.role.set('customer');
    store.lastCard.set(id);
    void loadPub();
  }, [id, loadPub]);

  useEffect(() => {
    if (address) void loadState(address);
  }, [address, loadState]);

  // success animation when the stamp count grows
  useEffect(() => {
    if (!state) return;
    const n = state.customerCard.stamps;
    if (stampsRef.current >= 0 && n > stampsRef.current) {
      setEarned(true);
      setPhase('idle');
      setWaitStart(null);
      setTimeout(() => setEarned(false), 4000);
    }
    stampsRef.current = n;
  }, [state]);

  // polling while waiting for the chain (≤ 90 s), and slow background polling while an intent is pending
  useEffect(() => {
    if (!address || !state) return;
    const waiting = phase === 'waiting';
    const pending = !!state.pendingIntent && !state.pendingIntent.lastError;
    if (!waiting && !pending) return;
    const idInt = setInterval(
      () => {
        void loadState(address);
        if (waiting && waitStart && Date.now() - waitStart > WAIT_MAX_S * 1000) {
          setPhase('idle');
          setSlowHint(true);
        }
      },
      waiting ? POLL_MS : 15000,
    );
    return () => clearInterval(idInt);
  }, [address, state, phase, waitStart, loadState]);

  const connect = async (): Promise<{ addr: string; ccId: string } | null> => {
    setError(null);
    setPhase('connecting');
    try {
      const addr = await wallet.getAddress();
      let deviceId: string | undefined;
      try {
        deviceId = await wallet.getDeviceId(t('card.deviceReason'));
      } catch {
        deviceId = undefined; // user declined — IP cap applies server-side
      }
      const r = await api.customerCard(id, { address: addr, deviceId });
      store.address.set(addr);
      store.customerCard.set(id, r.customerCard.id);
      setAddress(addr);
      setPhase('idle');
      return { addr, ccId: r.customerCard.id };
    } catch (e) {
      setError(errorCode(e));
      setPhase('idle');
      return null;
    }
  };

  const pay = async (force = false) => {
    setError(null);
    setSlowHint(false);
    let addr = address;
    let ccId = store.customerCard.get(id);
    if (!addr || !ccId) {
      const c = await connect();
      if (!c) return;
      addr = c.addr;
      ccId = c.ccId;
    }
    if (!pub) return;
    setPhase('creatingIntent');
    try {
      const r = await api.intent(id, { customerCardId: ccId, address: addr });
      const blockedUntil = r.velocityBlockedUntil ?? state?.velocityBlockedUntil ?? null;
      if (!force && blockedUntil && blockedUntil > Date.now() / 1000) {
        setAskVelocity(blockedUntil);
        setPhase('idle');
        return;
      }
      setAskVelocity(null);
      setPhase('paying');
      const res = await wallet.sendPayment({ to: r.intent.toAddress, amountLuna: r.intent.amountLuna, memo: r.intent.memo });
      void api.notify(r.intent.id, res.txHash).catch(() => undefined);
      setWaitStart(Date.now());
      setPhase('waiting');
      void loadState(addr);
    } catch (e) {
      setPhase('idle');
      setError(isWalletError(e) && e.code === 'rejected' ? 'WALLET_REJECTED' : errorCode(e));
    }
  };

  const redeem = async () => {
    if (!address || !state || !pub) return;
    setError(null);
    setPhase('redeeming');
    try {
      const ch = await api.redeemChallenge(state.customerCard.id, address);
      let body: { address: string; nonce: string; signature?: string; publicKey?: string; txHash?: string } = { address, nonce: ch.nonce };
      try {
        const sig = await wallet.signMessage(ch.message);
        body = { ...body, signature: sig.signature, publicKey: sig.publicKey };
      } catch (e) {
        if (!(isWalletError(e) && e.code === 'unsupported')) throw e;
        // Plan B: zero-value tx to the merchant with memo NSR:<nonce>
        const res = await wallet.sendPayment({ to: pub.merchant.address, amountLuna: 0, memo: `NSR:${ch.nonce}` });
        if (!res.txHash) throw new ApiError('TX_NOT_FOUND', t('errors.TX_NOT_FOUND'), 404);
        body = { ...body, txHash: res.txHash };
        for (let i = 0; i < 10; i++) {
          try {
            const r = await api.redeem(state.customerCard.id, body);
            nav(`/c/${id}/redeem/${r.redemption.id}`);
            return;
          } catch (e2) {
            if (!(e2 instanceof ApiError && e2.code === 'TX_NOT_FOUND')) throw e2;
            await new Promise((r) => setTimeout(r, 3000));
          }
        }
        throw new ApiError('TX_NOT_FOUND', t('errors.TX_NOT_FOUND'), 404);
      }
      const r = await api.redeem(state.customerCard.id, body);
      nav(`/c/${id}/redeem/${r.redemption.id}`);
    } catch (e) {
      setPhase('idle');
      if (e instanceof ApiError && e.code === 'REDEMPTION_ACTIVE') {
        const red = e.extra.redemption as { id: string } | undefined;
        if (red) {
          nav(`/c/${id}/redeem/${red.id}`);
          return;
        }
      }
      setError(errorCode(e));
    }
  };

  const disconnect = () => {
    store.address.clear();
    setAddress(null);
    setState(null);
    stampsRef.current = -1;
  };

  const velocityLeft = useCountdown(askVelocity);

  // ---------- render
  if (pubError) {
    return (
      <Layout back="/">
        <div className="py-6">
          <ErrorState message={pubError === 'NOT_FOUND' ? t('card.notFound') : t(`errors.${pubError}`, { defaultValue: t('common.unknownError') })} onRetry={pubError === 'NOT_FOUND' ? undefined : loadPub} />
          {pubError === 'NOT_FOUND' ? (
            <Link to="/" className="mt-4 block text-center text-sm underline">{t('notFound.home')}</Link>
          ) : null}
        </div>
      </Layout>
    );
  }
  if (!pub) {
    return (
      <Layout back="/">
        <div className="space-y-4 py-4">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </Layout>
    );
  }

  const card = state?.card ?? pub.card;
  const merchant = state?.merchant ?? pub.merchant;
  const price = state?.price ?? pub.price;
  const stamps = state?.customerCard.stamps ?? 0;
  const full = !!state && stamps >= card.stampsRequired;
  const busy = phase !== 'idle' && phase !== 'waiting';
  const lastErr = state?.lastIntent?.lastError;
  const showAmountTooLow = lastErr === 'AMOUNT_TOO_LOW' && state?.lastIntent?.status === 'pending';
  const minLabel = fiat(card.minFiatAmount, card.fiatCurrency, i18n.language);

  return (
    <Layout back="/" footer={false}>
      <div className="pb-44">
        <div className="pt-2 pb-4">
          <h1 className="text-2xl font-bold leading-tight">{merchant.name}</h1>
          <p className="text-sm text-ink-soft">
            {merchant.city ? `${merchant.city} · ` : ''}
            {card.title}
          </p>
        </div>

        <Card className={`transition ${earned ? 'ring-4 ring-accent/40' : ''}`}>
          <StampGrid total={card.stampsRequired} filled={stamps} />
          <p className="mt-4 text-center text-sm font-semibold">{full ? t('card.full') : t('card.progress', { stamps, required: card.stampsRequired })}</p>
          <p className="mt-3 text-center text-xs text-ink-soft">
            {t('card.minPurchase', { amount: minLabel })}
            {price ? <span> · {t('card.approxNim', { nim: nim(price.minLuna, i18n.language) })}</span> : null}
          </p>
          <div className="mt-3 rounded-2xl bg-paper px-4 py-3 text-center text-sm">
            <span className="font-semibold">{t('card.reward')}:</span> {card.rewardText}
          </div>
        </Card>

        <div className="mt-4 space-y-3">
          {earned ? (
            <Banner tone="ok">
              <span className="font-semibold">✓ {t('card.stampEarned')}</span>
            </Banner>
          ) : null}
          {phase === 'waiting' ? (
            <Banner tone="info">
              <p className="font-medium">{t('card.waiting')}</p>
              <p className="mt-1 text-xs text-ink-soft">{t('card.waitingHint')}</p>
            </Banner>
          ) : null}
          {slowHint ? (
            <Banner tone="warn">
              <p className="font-medium">{t('card.stillWaiting')}</p>
              <p className="mt-1 text-xs">{t('card.checkLater')}</p>
            </Banner>
          ) : null}
          {showAmountTooLow ? <Banner tone="warn">{t('card.amountTooLow')}</Banner> : null}
          {state?.activeRedemption ? (
            <Banner tone="ok">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{t('card.redemptionOpen')}</span>
                <Link to={`/c/${id}/redeem/${state.activeRedemption.id}`} className="shrink-0 rounded-xl bg-ink px-3 py-2 text-xs font-semibold text-white">{t('card.showCode')}</Link>
              </div>
            </Banner>
          ) : null}
          {askVelocity ? (
            <Banner tone="warn">
              <p className="font-medium">{t('card.velocityWarning', { minutes: card.velocityMinutes })}</p>
              <p className="mt-1 text-xs">{mmss(velocityLeft)}</p>
              <div className="mt-3 flex gap-2">
                <Button variant="ghost" className="min-h-10 text-sm" onClick={() => setAskVelocity(null)}>{t('common.notNow')}</Button>
                <Button variant="secondary" className="min-h-10 text-sm" onClick={() => void pay(true)}>{t('common.yes')}</Button>
              </div>
            </Banner>
          ) : null}
          {error ? (
            <ErrorState
              message={t(`errors.${error}`, { defaultValue: t('common.unknownError') })}
              action={error === 'WALLET_UNAVAILABLE' ? <a href={links.openHere()} className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-ink px-4 text-sm font-semibold text-white">{t('common.openInNimiqPay')}</a> : undefined}
              onRetry={error === 'WALLET_UNAVAILABLE' ? undefined : () => setError(null)}
            />
          ) : null}
          {stateError && !error ? <ErrorState message={t(`errors.${stateError}`, { defaultValue: t('common.unknownError') })} onRetry={() => address && void loadState(address)} /> : null}
          {phase === 'connecting' ? (
            <Banner tone="info">
              <p className="font-medium">{t('connecting.title')}</p>
              <p className="mt-1 text-xs text-ink-soft">{t('connecting.hint')}</p>
            </Banner>
          ) : null}
          {phase === 'redeeming' ? (
            <Banner tone="info">
              <p className="font-medium">{t('redeem.signing')}</p>
              <p className="mt-1 text-xs text-ink-soft">{t('redeem.signHint')}</p>
            </Banner>
          ) : null}
          {available === false && !address ? (
            <Banner tone="info">
              <p className="font-medium">{t('card.readOnly')}</p>
              <p className="mt-1 text-xs text-ink-soft">{t('connecting.unlistedNote')}</p>
            </Banner>
          ) : null}
          {address ? (
            <p className="text-center text-xs text-ink-soft">
              {t('card.connectedAs', { address: `${address.slice(0, 9)}…${address.slice(-4)}` })}{' '}
              <button type="button" onClick={disconnect} className="underline">{t('card.notYou')}</button>
            </p>
          ) : null}
          {!address && available !== false ? <p className="text-center text-xs text-ink-soft">{t('card.youCanEdit')}</p> : null}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto w-full max-w-md space-y-2 px-4 pt-3 safe-bottom">
          {!address ? (
            available === false ? (
              <a href={links.openHere()} className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-accent px-5 text-base font-semibold text-ink">{t('common.openInNimiqPay')}</a>
            ) : (
              <Button onClick={() => void connect()} busy={phase === 'connecting'} disabled={available === null}>{t('card.connect')}</Button>
            )
          ) : full ? (
            <>
              <Button onClick={() => void redeem()} busy={phase === 'redeeming'} disabled={busy || !!state?.activeRedemption}>{t('card.redeem')}</Button>
              <Button variant="ghost" onClick={() => void pay()} busy={phase === 'paying' || phase === 'creatingIntent'} disabled={busy}>{t('card.pay')}</Button>
            </>
          ) : (
            <>
              <Button onClick={() => void pay()} busy={phase === 'paying' || phase === 'creatingIntent'} disabled={busy || available === false}>
                {price ? t('card.payAmount', { amount: minLabel }) : t('card.pay')}
              </Button>
              <Button variant="ghost" disabled className="min-h-10 text-sm">{t('card.redeemLocked')}</Button>
            </>
          )}
          <div className="flex justify-center pb-1">
            <Link to={`/c/${id}/claim`} className="text-xs text-ink-soft underline-offset-2 hover:underline">{t('card.noStamp')}</Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
