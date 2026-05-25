// ===== i18n Configuration for AI Avatar DeFi System =====

export type Locale = 'zh' | 'en' | 'ja' | 'ko' | 'es' | 'fr' | 'de' | 'ar';

export interface LocaleConfig {
  code: Locale;
  label: string;
  flag: string;
  rtl: boolean;
}

export const locales: LocaleConfig[] = [
  { code: 'zh', label: '中文', flag: '🇨🇳', rtl: false },
  { code: 'en', label: 'English', flag: '🇺🇸', rtl: false },
  { code: 'ja', label: '日本語', flag: '🇯🇵', rtl: false },
  { code: 'ko', label: '한국어', flag: '🇰🇷', rtl: false },
  { code: 'es', label: 'Español', flag: '🇪🇸', rtl: false },
  { code: 'fr', label: 'Français', flag: '🇫🇷', rtl: false },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪', rtl: false },
  { code: 'ar', label: 'العربية', flag: '🇸🇦', rtl: true },
];

export const defaultLocale: Locale = 'zh';

export const localeCodes: Locale[] = locales.map((l) => l.code);

export function isRtl(locale: Locale): boolean {
  const config = locales.find((l) => l.code === locale);
  return config?.rtl ?? false;
}

export function getLocaleConfig(locale: string): LocaleConfig | undefined {
  return locales.find((l) => l.code === locale);
}

/**
 * Detects the preferred locale from browser settings.
 * Falls back to default locale (zh) if no match is found.
 */
export function detectBrowserLocale(): Locale {
  if (typeof navigator === 'undefined') return defaultLocale;

  const browserLangs = navigator.languages || [navigator.language];

  for (const lang of browserLangs) {
    const code = lang.toLowerCase().split('-')[0] as Locale;
    if (localeCodes.includes(code)) {
      return code;
    }
  }

  return defaultLocale;
}

/**
 * Gets the stored locale from localStorage, or returns null.
 */
export function getStoredLocale(): Locale | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('bb-locale');
  if (stored && localeCodes.includes(stored as Locale)) {
    return stored as Locale;
  }
  return null;
}

/**
 * Stores the selected locale in localStorage.
 */
export function setStoredLocale(locale: Locale): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('bb-locale', locale);
}
