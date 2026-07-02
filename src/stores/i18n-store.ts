// ===== i18n Store — Zustand Global Locale State =====

import { create } from 'zustand';
import {
  type Locale,
  defaultLocale,
  getStoredLocale,
  detectBrowserLocale,
  setStoredLocale,
  isRtl,
} from '@/lib/i18n-config';

interface I18nState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return defaultLocale;
  return getStoredLocale() || detectBrowserLocale();
}

export const useI18nStore = create<I18nState>((set) => ({
  locale: getInitialLocale(),
  setLocale: (newLocale: Locale) => {
    set({ locale: newLocale });
    setStoredLocale(newLocale);

    // Update document direction for RTL languages
    if (typeof document !== 'undefined') {
      document.documentElement.dir = isRtl(newLocale) ? 'rtl' : 'ltr';
      document.documentElement.lang = newLocale;
    }
  },
}));
