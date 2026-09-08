import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getWallet } from '../wallet';
import { store } from '../lib/storage';
import de from './de.json';
import en from './en.json';
import es from './es.json';
import fr from './fr.json';

export const SUPPORTED = ['en', 'es', 'de', 'fr'] as const;
export type Lang = (typeof SUPPORTED)[number];

function detect(): Lang {
  const pick = (code: string | null | undefined): Lang | null => {
    const two = (code ?? '').toLowerCase().slice(0, 2);
    return (SUPPORTED as readonly string[]).includes(two) ? (two as Lang) : null;
  };
  const fromQuery = pick(new URLSearchParams(window.location.search).get('lang'));
  const fromHost = pick(getWallet().getLanguage());
  const fromStore = pick(store.lang.get());
  const fromNav = pick(navigator.language);
  return fromQuery ?? fromHost ?? fromStore ?? fromNav ?? 'en';
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, es: { translation: es }, de: { translation: de }, fr: { translation: fr } },
  lng: detect(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

document.documentElement.lang = i18n.language;
export default i18n;
