import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { api, session, type Merchant } from '../api/client';
import { Layout } from '../components/Layout';
import { QrCode } from '../components/QrCode';
import { Voucher } from '../components/Voucher';
import { Button, ErrorState, Field, inputCls, Notice, Sheet } from '../components/ui';
import { useWalletAvailable } from '../hooks/useWalletAvailable';
import { errorCode } from '../lib/errors';
import { links } from '../lib/links';
import { store } from '../lib/storage';
import { getWallet, isWalletError } from '../wallet';

/** Signs in with the wallet inside Nimiq Pay. Returns the merchant (null if none yet). */
export async function signInWithWallet(handoff?: string): Promise<{ merchant: Merchant | null; address: string }> {
  const wallet = getWallet();
  const address = await wallet.getAddress();
  const ch = await api.challenge(address);
  let body: Parameters<typeof api.verify>[0] = { address, nonce: ch.nonce, handoff };
  try {
    const sig = await wallet.signMessage(ch.message);
    body = { ...body, signature: sig.signature, publicKey: sig.publicKey };
  } catch (e) {
    if (!(isWalletError(e) && e.code === 'unsupported')) throw e;
    // Plan B: zero-value tx to own address with memo NSA:<nonce>
    const res = await wallet.sendPayment({ to: address, amountLuna: 0, memo: `NSA:${ch.nonce}` });
    if (!res.txHash) throw e;
    body = { ...body, txHash: res.txHash };
    for (let i = 0; i < 10; i++) {
      try {
        const r = await api.verify(body);
        session.set(r.token);
        return { merchant: r.merchant, address };
      } catch (e2) {
        if (!(e2 instanceof Error && 'code' in e2 && (e2 as { code: string }).code === 'TX_NOT_FOUND')) throw e2;
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
    throw e;
  }
  const r = await api.verify(body);
  session.set(r.token);
  return { merchant: r.merchant, address };
}

export default function MerchantSetup() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const available = useWalletAvailable();
  const [step, setStep] = useState<1 | 2>(session.get() ? 2 : 1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handoff, setHandoff] = useState<{ nonce: string; deepLink: string; loginUrl: string } | null>(null);
  const pollRef = useRef<number | null>(null);

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [title, setTitle] = useState('');
  const [reward, setReward] = useState('');
  const [stampsRequired, setStampsRequired] = useState(10);
  const [minAmount, setMinAmount] = useState('');
  const [currency, setCurrency] = useState<'NGN' | 'USD' | 'EUR'>('NGN');

  useEffect(() => {
    store.role.set('business');
  }, []);

  // If already signed in and a merchant exists, go to the dashboard.
  useEffect(() => {
    if (!session.get()) return;
    api
      .me()
      .then((r) => {
        if (r.merchant) nav('/m', { replace: true });
        else setStep(2);
      })
      .catch(() => setStep(1));
  }, [nav]);

  // Laptop flow: no wallet → QR handoff + polling
  useEffect(() => {
    if (available !== false || step !== 1 || handoff) return;
    let cancelled = false;
    api
      .handoff()
      .then((h) => {
        if (cancelled) return;
        setHandoff(h);
        pollRef.current = window.setInterval(async () => {
          try {
            const r = await api.handoffSession(h.nonce);
            if (r.token) {
              session.set(r.token);
              if (pollRef.current) clearInterval(pollRef.current);
              if (r.merchant) nav('/m', { replace: true });
              else setStep(2);
            }
          } catch (e) {
            if (errorCode(e) === 'CHALLENGE_EXPIRED') {
              if (pollRef.current) clearInterval(pollRef.current);
              setHandoff(null);
            }
          }
        }, 2000);
      })
      .catch((e) => setError(errorCode(e)));
    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [available, step, handoff, nav]);

  const signIn = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await signInWithWallet();
      if (r.merchant) nav('/m', { replace: true });
      else setStep(2);
    } catch (e) {
      setError(errorCode(e));
    } finally {
      setBusy(false);
    }
  };

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.createMerchant({ name: name.trim(), city: city.trim() || undefined, card: { title: title.trim(), rewardText: reward.trim(), stampsRequired, minFiatAmount: Number(minAmount), fiatCurrency: currency } });
      nav('/m', { replace: true });
    } catch (err) {
      const code = errorCode(err);
      if (code === 'UNAUTHORIZED') setStep(1);
      setError(code);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout back="/">
      <h1 className="t-display pt-2 text-[2rem]">{t('setup.title')}</h1>
      <ol className="mt-3 flex gap-2" aria-label="steps">
        {[t('setup.step1'), t('setup.step2')].map((label, i) => (
          <li key={label} className={`t-label px-3 py-1.5 ${step === i + 1 ? 'bg-ink text-white' : 'border-2 border-rule text-ink-faint'}`}>{label}</li>
        ))}
      </ol>

      {step === 1 ? (
        <Sheet className="mt-5 p-5">
          {available === false ? (
            <div className="text-center">
              <p className="t-display text-[1.5rem]">{t('setup.laptopTitle')}</p>
              <p className="mt-2 text-sm text-ink-soft">{t('setup.laptopHint')}</p>
              {handoff ? (
                <>
                  <div className="my-5 flex justify-center"><QrCode value={links.deepLink(`/m/login?handoff=${handoff.nonce}`)} /></div>
                  <p className="t-label pulse-soft text-ink-soft">{t('setup.laptopWaiting')}</p>
                  <a href={links.deepLink(`/m/login?handoff=${handoff.nonce}`)} className="t-label mt-4 inline-block text-ink underline underline-offset-4">{t('setup.laptopOpen')}</a>
                  <p className="mt-4 text-xs text-ink-soft">{t('connecting.unlistedNote')}</p>
                </>
              ) : error ? null : (
                <p className="my-6 text-sm text-ink-soft">{t('common.loading')}</p>
              )}
            </div>
          ) : (
            <>
              <p className="text-sm text-ink-soft">{t('setup.signHint')}</p>
              <div className="mt-4">
                <Button variant="panel" onClick={() => void signIn()} busy={busy} disabled={available === null}>{busy ? t('setup.signingIn') : t('setup.signIn')}</Button>
              </div>
              {available === null ? <p className="t-label mt-3 text-center text-ink-faint">{t('connecting.title')}</p> : null}
            </>
          )}
          {error ? <div className="mt-4"><ErrorState message={t(`errors.${error}`, { defaultValue: t('common.unknownError') })} onRetry={() => setError(null)} /></div> : null}
        </Sheet>
      ) : (
        <form onSubmit={create} className="mt-5 space-y-6 pb-8">
          <div className="space-y-4">
            <Field label={t('setup.businessName')}><input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={40} className={inputCls} autoComplete="organization" /></Field>
            <Field label={t('setup.city')}><input value={city} onChange={(e) => setCity(e.target.value)} maxLength={40} className={inputCls} autoComplete="address-level2" /></Field>
            <Field label={t('setup.cardTitle')}><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('setup.cardTitlePh')} required minLength={2} maxLength={40} className={inputCls} /></Field>
            <Field label={t('setup.rewardText')}><input value={reward} onChange={(e) => setReward(e.target.value)} placeholder={t('setup.rewardPh')} required minLength={2} maxLength={80} className={inputCls} /></Field>
            <Field label={`${t('setup.stampsRequired')}: ${stampsRequired}`}>
              <input type="range" min={2} max={20} value={stampsRequired} onChange={(e) => setStampsRequired(Number(e.target.value))} className="w-full" />
            </Field>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Field label={t('setup.minPurchase')}><input type="number" inputMode="decimal" min={0.01} step="any" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} required className={`${inputCls} t-num`} /></Field>
              <Field label={t('setup.currency')}>
                <select value={currency} onChange={(e) => setCurrency(e.target.value as 'NGN' | 'USD' | 'EUR')} className={`${inputCls} w-24`}>
                  <option value="NGN">NGN</option><option value="USD">USD</option><option value="EUR">EUR</option>
                </select>
              </Field>
            </div>
          </div>
          <div>
            <p className="t-label mb-2 text-ink-soft">{t('setup.preview')}</p>
            <Voucher name={name} city={city} title={title} rewardText={reward} stampsRequired={stampsRequired} minFiatAmount={Number(minAmount) || 0} fiatCurrency={currency} stamps={Math.min(3, stampsRequired - 1)} compact />
          </div>
          {error ? (
            error === 'MERCHANT_EXISTS' ? (
              <Notice tone="warn">{t('setup.alreadyHave')} <Link to="/m" className="font-bold underline underline-offset-4">{t('setup.goDashboard')}</Link></Notice>
            ) : (
              <ErrorState message={t(`errors.${error}`, { defaultValue: t('common.unknownError') })} onRetry={() => setError(null)} />
            )
          ) : null}
          <Button type="submit" variant="panel" busy={busy}>{busy ? t('setup.creating') : t('setup.create')}</Button>
        </form>
      )}
    </Layout>
  );
}
