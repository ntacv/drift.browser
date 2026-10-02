import { useBrowserStore } from '../store/browserStore';

import { translations, type TranslationKey } from './translations';

export const useI18n = () => {
  const language = useBrowserStore((state) => state.language);

  const t = (key: TranslationKey): string => {
    // `language` is typed as AppLanguage but can hold a stale/invalid value
    // from persisted or imported state, so fall back to English instead of
    // crashing on `translations[language][key]`.
    const dict = translations[language] ?? translations.en;
    return dict[key] ?? translations.en[key] ?? key;
  };

  return {
    language,
    t,
  };
};
