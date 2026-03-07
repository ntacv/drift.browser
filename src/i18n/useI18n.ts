import { useBrowserStore } from '../store/browserStore';

import { translations, type TranslationKey } from './translations';

export const useI18n = () => {
  const language = useBrowserStore((state) => state.language);

  const t = (key: TranslationKey): string => {
    return translations[language][key] ?? translations.en[key] ?? key;
  };

  return {
    language,
    t,
  };
};
