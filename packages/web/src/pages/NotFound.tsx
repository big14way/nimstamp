import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { EmptyState } from '../components/ui';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <Layout>
      <div className="py-10">
        <EmptyState title={t('notFound.title')} hint={t('notFound.hint')}>
          <Link to="/" className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-accent px-5 font-semibold text-ink">{t('notFound.home')}</Link>
        </EmptyState>
      </div>
    </Layout>
  );
}
