import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import pt from './locales/pt.json';
import es from './locales/es.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      pt: { translation: pt },
      es: { translation: es }
    },
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes by default
    },
    // Add debug mode for development (disable in production)
    debug: false
  });

export default i18n;
