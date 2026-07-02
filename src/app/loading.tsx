'use client';

import { translate } from '@/hooks/use-i18n';
import { getStoredLocale } from '@/lib/i18n-config';
import { defaultLocale } from '@/lib/i18n-config';

export default function Loading() {
  const locale = getStoredLocale() || defaultLocale;
  const t = (key: string) => translate(locale, key);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 animate-pulse" />
        <p className="text-slate-400 text-sm">{t('loading.text')}</p>
      </div>
    </div>
  );
}
