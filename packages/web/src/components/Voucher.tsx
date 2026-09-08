import { useTranslation } from 'react-i18next';
import { fiat, nim } from '../lib/format';
import { StampGrid } from './StampGrid';

/**
 * The loyalty card as a printed voucher: ultramarine header, perforation, punch grid,
 * denomination line, reward box, serial. Used live on the card page and as the setup preview.
 */
export function Voucher({
  name,
  city,
  title,
  rewardText,
  stampsRequired,
  minFiatAmount,
  fiatCurrency,
  stamps = 0,
  minLuna,
  serial,
  full = false,
  highlight = false,
  compact = false,
}: {
  name: string;
  city?: string | null;
  title: string;
  rewardText: string;
  stampsRequired: number;
  minFiatAmount: number;
  fiatCurrency: string;
  stamps?: number;
  minLuna?: number | null;
  serial?: string | null;
  full?: boolean;
  highlight?: boolean;
  compact?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const amount = fiat(minFiatAmount || 0, fiatCurrency, i18n.language);
  return (
    <article className={`bg-white transition-shadow duration-300 ${highlight ? 'shadow-lift' : 'shadow-[0_1px_2px_oklch(22%_0.03_272/0.08)]'}`}>
      <header className="bg-panel px-5 pt-5 pb-4 text-white">
        <p className="t-label text-panel-tint">{title || '—'}</p>
        <h1 className={`t-display mt-1 ${compact ? 'text-[1.75rem]' : 'text-[2.25rem]'}`}>{name || '—'}</h1>
        {city ? <p className="mt-1 text-sm text-panel-tint">{city}</p> : null}
      </header>
      <div className="perf perf-on-panel" aria-hidden="true" />
      <div className={`px-5 ${compact ? 'py-4' : 'py-5'}`}>
        <StampGrid total={stampsRequired} filled={stamps} size={compact ? 'sm' : 'md'} />
        <p className={`t-num mt-4 text-center font-bold ${full ? 'text-panel' : 'text-ink'}`}>{full ? t('card.full') : t('card.progress', { stamps, required: stampsRequired })}</p>
        <p className="t-num mt-1 text-center text-sm text-ink-soft">
          {t('card.minPurchase', { amount })}
          {minLuna ? <span> · {t('card.approxNim', { nim: nim(minLuna, i18n.language) })}</span> : null}
        </p>
      </div>
      <div className="mx-5 border-2 border-ink px-4 py-3">
        <p className="t-label text-ink-soft">{t('card.reward')}</p>
        <p className="mt-0.5 text-lg font-bold leading-snug">{rewardText || '—'}</p>
      </div>
      <footer className="t-num flex items-center justify-between px-5 py-3 text-[11px] font-bold tracking-[0.12em] text-ink-faint uppercase">
        <span>NimStamp</span>
        <span>{serial ? `Nº ${serial}` : t('app.runsInside')}</span>
      </footer>
    </article>
  );
}
