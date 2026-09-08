import { useTranslation } from 'react-i18next';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui';

export default function Privacy() {
  const { t } = useTranslation();
  return (
    <Layout back="/">
      <h1 className="pt-2 text-2xl font-bold">{t('privacy.title')}</h1>
      <Card className="mt-4 space-y-4 text-sm leading-relaxed">
        <p>{t('privacy.p1')}</p>
        <div><h2 className="font-semibold">{t('privacy.collectTitle')}</h2><ul className="mt-1 list-disc space-y-1 pl-5 text-ink-soft"><li>{t('privacy.c1')}</li><li>{t('privacy.c2')}</li><li>{t('privacy.c3')}</li><li>{t('privacy.c4')}</li><li>{t('privacy.c5')}</li></ul></div>
        <div><h2 className="font-semibold">{t('privacy.notTitle')}</h2><p className="mt-1 text-ink-soft">{t('privacy.n1')}</p></div>
        <div><h2 className="font-semibold">{t('privacy.whyTitle')}</h2><p className="mt-1 text-ink-soft">{t('privacy.why')}</p></div>
        <div><h2 className="font-semibold">{t('privacy.retentionTitle')}</h2><p className="mt-1 text-ink-soft">{t('privacy.retention')}</p></div>
        <div><h2 className="font-semibold">{t('privacy.contactTitle')}</h2><p className="mt-1 text-ink-soft">{t('privacy.contact')}</p></div>
      </Card>
    </Layout>
  );
}
