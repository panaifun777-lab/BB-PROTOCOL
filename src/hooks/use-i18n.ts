'use client';

// ===== i18n Hook — reads locale from Zustand store (global reactive state) =====

import { useCallback, useEffect } from 'react';
import {
  type Locale,
  locales,
  isRtl,
} from '@/lib/i18n-config';
import { useI18nStore } from '@/stores/i18n-store';

// ── Message Imports ─────────────────────────────────────────
import zhMessages from '@/lib/messages/zh.json';
import enMessages from '@/lib/messages/en.json';
import jaMessages from '@/lib/messages/ja.json';
import koMessages from '@/lib/messages/ko.json';
import esMessages from '@/lib/messages/es.json';
import frMessages from '@/lib/messages/fr.json';
import deMessages from '@/lib/messages/de.json';
import arMessages from '@/lib/messages/ar.json';

import { defaultLocale } from '@/lib/i18n-config';

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

// ── Hook: useI18n (reads from Zustand store — all components share same locale) ──
export function useI18n() {
  const locale = useI18nStore((s) => s.locale);
  const setLocale = useI18nStore((s) => s.setLocale);

  // Set initial direction on mount and when locale changes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = isRtl(locale) ? 'rtl' : 'ltr';
      document.documentElement.lang = locale;
    }
  }, [locale]);

  // Memoize t based on locale — re-creates only when locale changes
  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => createTranslateFn(locale)(key, params),
    [locale]
  );

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
