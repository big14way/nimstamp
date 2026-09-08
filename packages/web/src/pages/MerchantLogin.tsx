import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Banner, Button, Card, ErrorState } from '../components/ui';
import { useWalletAvailable } from '../hooks/useWalletAvailable';
import { errorCode } from '../lib/errors';
import { links } from '../lib/links';
import { signInWithWallet } from './MerchantSetup';

/** Opened on the phone (inside Nimiq Pay) from the laptop's QR code. */
export default function MerchantLogin() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const handoff = params.get('handoff') ?? undefined;
  const available = useWalletAvailable();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ hasMerchant: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setSlow(true), 5000);
    return () => clearTimeout(id);
  }, []);

  const signIn = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await signInWithWallet(handoff);
      setDone({ hasMerchant: !!r.merchant });
    } catch (e) {
      setError(errorCode(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout>
      <h1 className="pt-2 text-2xl font-bold">{t('setup.step1')}</h1>
      <Card className="mt-4">
        {done ? (
          <Banner tone="ok">
            <p className="font-semibold">✓ {t('setup.loginDone')}</p>
            <p className="mt-1 text-xs">{t('setup.loginDoneHint')}</p>
            <Link to={done.hasMerchant ? '/m' : '/m/setup'} className="mt-3 inline-block text-sm underline">{t('common.continue')}</Link>
          </Banner>
        ) : (
          <>
            <p className="text-sm text-ink-soft">{t('setup.signHint')}</p>
            {available === false ? (
              <div className="mt-4 space-y-3">
                <ErrorState message={t('errors.WALLET_UNAVAILABLE')} action={<a href={links.openHere()} className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-ink px-4 text-sm font-semibold text-white">{t('common.openInNimiqPay')}</a>} />
              </div>
            ) : (
              <div className="mt-4">
                <Button onClick={() => void signIn()} busy={busy} disabled={available === null}>{busy ? t('setup.signingIn') : t('setup.signIn')}</Button>
                {available === null ? <p className="mt-3 text-center text-xs text-ink-soft">{t('connecting.title')}{slow ? ` ${t('connecting.hint')}` : ''}</p> : null}
              </div>
            )}
            {error ? <div className="mt-4"><ErrorState message={t(`errors.${error}`, { defaultValue: t('common.unknownError') })} onRetry={() => setError(null)} /></div> : null}
          </>
        )}
      </Card>
    </Layout>
  );
}
