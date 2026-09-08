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
          <Link to="/" className="t-display inline-flex min-h-12 items-center justify-center bg-ink px-5 text-[1.125rem] text-white">{t('notFound.home')}</Link>
        </EmptyState>
      </div>
    </Layout>
  );
}
