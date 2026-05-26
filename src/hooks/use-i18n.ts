'use client';

// ===== i18n Hook — wraps next-intl useTranslations with fallback =====

import { useCallback, useEffect, useState } from 'react';
import {
  type Locale,
  locales,
  defaultLocale,
  getStoredLocale,
  setStoredLocale,
  detectBrowserLocale,
  isRtl,
} from '@/lib/i18n-config';

// ── Message Imports ─────────────────────────────────────────
import zhMessages from '@/lib/messages/zh.json';
import enMessages from '@/lib/messages/en.json';
import jaMessages from '@/lib/messages/ja.json';
import koMessages from '@/lib/messages/ko.json';
import esMessages from '@/lib/messages/es.json';
import frMessages from '@/lib/messages/fr.json';
import deMessages from '@/lib/messages/de.json';
import arMessages from '@/lib/messages/ar.json';

const messageMap: Record<Locale, Record<string, Record<string, string>>> = {
  zh: zhMessages,
  en: enMessages,
  ja: jaMessages,
  ko: koMessages,
  es: esMessages,
  fr: frMessages,
  de: deMessages,
  ar: arMessages,
};

// ── Helper: Nested key access ────────────────────────────────
function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === 'string' ? current : undefined;
}

// ── Translation Function ─────────────────────────────────────
type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

function createTranslateFn(locale: Locale): TranslateFn {
  const messages = messageMap[locale];
  const fallbackMessages = messageMap[defaultLocale];

  return (key: string, params?: Record<string, string | number>): string => {
    // Try current locale first
    let value = getNestedValue(messages as unknown as Record<string, unknown>, key);

    // Fallback to default locale (Chinese)
    if (value === undefined) {
      value = getNestedValue(fallbackMessages as unknown as Record<string, unknown>, key);
    }

    // If still not found, return the key itself
    if (value === undefined) {
      return key;
    }

    // Replace interpolation params like {count}
    if (params) {
      return value.replace(/\{(\w+)\}/g, (_, paramName) => {
        const paramValue = params[paramName];
        return paramValue !== undefined ? String(paramValue) : `{${paramName}}`;
      });
    }

    return value;
  };
}

// ── Hook: useI18n ────────────────────────────────────────────
export function useI18n() {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === 'undefined') return defaultLocale;
    return getStoredLocale() || detectBrowserLocale();
  });

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    setStoredLocale(newLocale);

    // Update document direction for RTL languages
    if (typeof document !== 'undefined') {
      document.documentElement.dir = isRtl(newLocale) ? 'rtl' : 'ltr';
      document.documentElement.lang = newLocale;
    }
  }, []);

  // Set initial direction on mount
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = isRtl(locale) ? 'rtl' : 'ltr';
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const t = createTranslateFn(locale);

  return {
    t,
    locale,
    setLocale,
    locales,
    isRtl: isRtl(locale),
    direction: isRtl(locale) ? 'rtl' : 'ltr' as const,
  };
}

// ── Standalone translate function (for non-hook contexts) ────
export function translate(locale: Locale, key: string, params?: Record<string, string | number>): string {
  return createTranslateFn(locale)(key, params);
}

export type { Locale, TranslateFn };
