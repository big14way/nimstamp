import { useTranslation } from 'react-i18next';
import { fiat } from '../lib/format';
import { StampGrid } from './StampGrid';

export function CardPreview({ name, city, title, rewardText, stampsRequired, minFiatAmount, fiatCurrency, stamps = 0 }: { name: string; city?: string | null; title: string; rewardText: string; stampsRequired: number; minFiatAmount: number; fiatCurrency: string; stamps?: number }) {
  const { t, i18n } = useTranslation();
  return (
    <div className="rounded-3xl border border-line bg-white p-5">
      <div className="mb-4">
        <p className="text-lg font-bold leading-tight">{name || '—'}</p>
        {city ? <p className="text-sm text-ink-soft">{city}</p> : null}
        <p className="mt-1 text-sm font-medium text-ink-soft">{title || '—'}</p>
      </div>
      <StampGrid total={stampsRequired} filled={stamps} size="sm" />
      <p className="mt-4 text-xs text-ink-soft">{t('card.minPurchase', { amount: fiat(minFiatAmount || 0, fiatCurrency, i18n.language) })}</p>
      <p className="mt-1 text-sm">
        <span className="font-semibold">{t('card.reward')}:</span> {rewardText || '—'}
      </p>
    </div>
  );
}
