import { useTranslation } from 'react-i18next';
import { Layout } from '../components/Layout';
import { Rule } from '../components/ui';

export default function Privacy() {
  const { t } = useTranslation();
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="mt-6">
      <Rule>{title}</Rule>
      <div className="mt-3 max-w-[62ch] text-[0.9375rem] leading-relaxed text-ink">{children}</div>
    </section>
  );
  return (
    <Layout back="/">
      <h1 className="t-display pt-2 text-[2rem]">{t('privacy.title')}</h1>
      <p className="mt-3 max-w-[62ch] text-[0.9375rem] leading-relaxed">{t('privacy.p1')}</p>
      <Section title={t('privacy.collectTitle')}>
        <ul className="list-disc space-y-1.5 pl-5">{[1, 2, 3, 4, 5].map((n) => <li key={n}>{t(`privacy.c${n}`)}</li>)}</ul>
      </Section>
      <Section title={t('privacy.notTitle')}><p>{t('privacy.n1')}</p></Section>
      <Section title={t('privacy.whyTitle')}><p>{t('privacy.why')}</p></Section>
      <Section title={t('privacy.retentionTitle')}><p>{t('privacy.retention')}</p></Section>
      <Section title={t('privacy.contactTitle')}><p className="pb-6">{t('privacy.contact')}</p></Section>
    </Layout>
  );
}
