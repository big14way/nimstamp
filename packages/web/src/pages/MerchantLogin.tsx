import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button, ErrorState, Notice, Sheet } from '../components/ui';
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
      <h1 className="t-display pt-2 text-[2rem]">{t('setup.step1')}</h1>
      <Sheet className="mt-5 p-5">
        {done ? (
          <Notice tone="ok">
            <p className="font-bold">{t('setup.loginDone')}</p>
            <p className="mt-1 text-xs">{t('setup.loginDoneHint')}</p>
            <Link to={done.hasMerchant ? '/m' : '/m/setup'} className="t-label mt-3 inline-block text-ink underline underline-offset-4">{t('common.continue')}</Link>
          </Notice>
        ) : (
          <>
            <p className="text-sm text-ink-soft">{t('setup.signHint')}</p>
            {available === false ? (
              <div className="mt-4">
                <ErrorState message={t('errors.WALLET_UNAVAILABLE')} action={<a href={links.openHere()} className="t-label self-start bg-ink px-3 py-2 text-white">{t('common.openInNimiqPay')}</a>} />
              </div>
            ) : (
              <div className="mt-4">
                <Button variant="panel" onClick={() => void signIn()} busy={busy} disabled={available === null}>{busy ? t('setup.signingIn') : t('setup.signIn')}</Button>
                {available === null ? <p className="t-label mt-3 text-center text-ink-faint">{t('connecting.title')}{slow ? ` ${t('connecting.hint')}` : ''}</p> : null}
              </div>
            )}
            {error ? <div className="mt-4"><ErrorState message={t(`errors.${error}`, { defaultValue: t('common.unknownError') })} onRetry={() => setError(null)} /></div> : null}
          </>
        )}
      </Sheet>
    </Layout>
  );
}
