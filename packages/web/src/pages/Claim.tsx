import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { api, type Stamp } from '../api/client';
import { Layout } from '../components/Layout';
import { Banner, Button, Card, ErrorState, Field, inputCls } from '../components/ui';
import { errorCode } from '../lib/errors';
import { links } from '../lib/links';
import { store } from '../lib/storage';

export default function Claim() {
  const { cardId = '' } = useParams();
  const { t } = useTranslation();
  const id = cardId.toUpperCase();
  const ccId = store.customerCard.get(id);
  const [hash, setHash] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ stamp: Stamp; counted: boolean } | null>(null);
  const [showHint, setShowHint] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ccId) {
      setError('NOT_FOUND');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setResult(await api.claim(ccId, hash.trim()));
    } catch (err) {
      setError(errorCode(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout back={`/c/${id}`}>
      <h1 className="pt-2 text-2xl font-bold">{t('claim.title')}</h1>
      <p className="mt-1 text-sm text-ink-soft">{t('claim.intro')}</p>
      {!ccId ? (
        <div className="mt-4">
          <ErrorState message={t('card.connectHint')} action={<Link to={`/c/${id}`} className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-ink px-4 text-sm font-semibold text-white">{t('claim.backToCard')}</Link>} />
        </div>
      ) : result ? (
        <Card className="mt-4">
          <Banner tone={result.counted ? 'ok' : 'warn'}>
            <p className="font-semibold">{result.counted ? `✓ ${t('claim.success')}` : t('claim.successNotCounted')}</p>
          </Banner>
          <a href={links.tx(result.stamp.txHash)} target="_blank" rel="noreferrer" className="mt-3 block text-center text-xs underline">{t('common.viewTx')}</a>
          <Link to={`/c/${id}`} className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-accent px-5 font-semibold text-ink">{t('claim.backToCard')}</Link>
        </Card>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-4">
          <Field label={t('claim.label')}>
            <textarea value={hash} onChange={(e) => setHash(e.target.value)} placeholder={t('claim.placeholder')} rows={3} required className={`${inputCls} py-3 font-mono text-sm`} spellCheck={false} autoCapitalize="none" autoCorrect="off" />
          </Field>
          <button type="button" onClick={() => setShowHint((s) => !s)} className="text-sm underline">{t('claim.where')}</button>
          {showHint ? <Banner tone="info">{t('claim.whereHint')}</Banner> : null}
          {error ? <ErrorState message={t(`errors.${error}`, { defaultValue: t('common.unknownError') })} onRetry={() => setError(null)} /> : null}
          <Button type="submit" busy={busy} disabled={hash.trim().length < 64}>{busy ? t('claim.checking') : t('claim.submit')}</Button>
        </form>
      )}
    </Layout>
  );
}
