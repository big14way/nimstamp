import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { api, type Stamp } from '../api/client';
import { Layout } from '../components/Layout';
import { Button, ErrorState, Field, Icon, inputCls, Notice } from '../components/ui';
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
      <h1 className="t-display pt-2 text-[2rem]">{t('claim.title')}</h1>
      <p className="mt-2 max-w-[38ch] text-[0.9375rem] text-ink-soft">{t('claim.intro')}</p>
      {!ccId ? (
        <div className="mt-5">
          <ErrorState message={t('card.connectHint')} action={<Link to={`/c/${id}`} className="t-label self-start bg-ink px-3 py-2 text-white">{t('claim.backToCard')}</Link>} />
        </div>
      ) : result ? (
        <div className="mt-5 space-y-4">
          <Notice tone={result.counted ? 'ok' : 'warn'}>
            <p className="font-bold">{result.counted ? t('claim.success') : t('claim.successNotCounted')}</p>
            <a href={links.tx(result.stamp.txHash)} target="_blank" rel="noreferrer" className="t-label mt-2 inline-flex items-center gap-1 text-ink underline underline-offset-4"><Icon.Link className="h-4 w-4" />{t('common.viewTx')}</a>
          </Notice>
          <Link to={`/c/${id}`} className="t-display inline-flex min-h-13 w-full items-center justify-center bg-ink px-5 text-[1.25rem] text-white">{t('claim.backToCard')}</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-4">
          <Field label={t('claim.label')}>
            <textarea value={hash} onChange={(e) => setHash(e.target.value)} placeholder={t('claim.placeholder')} rows={3} required className={`${inputCls} t-num py-3 font-mono text-sm`} spellCheck={false} autoCapitalize="none" autoCorrect="off" />
          </Field>
          <button type="button" onClick={() => setShowHint((s) => !s)} className="t-label text-ink underline underline-offset-4">{t('claim.where')}</button>
          {showHint ? <Notice tone="info">{t('claim.whereHint')}</Notice> : null}
          {error ? <ErrorState message={t(`errors.${error}`, { defaultValue: t('common.unknownError') })} onRetry={() => setError(null)} /> : null}
          <Button type="submit" busy={busy} disabled={hash.trim().length < 64}>{busy ? t('claim.checking') : t('claim.submit')}</Button>
        </form>
      )}
    </Layout>
  );
}
