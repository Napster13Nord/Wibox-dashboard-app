"use client";

import { useI18n, Locale } from '@/lib/i18n';
import { TranslationMap } from '@/lib/types';

/**
 * Returns a function that resolves the translated name for an entity
 * based on the current locale. Falls back to the original `name` field
 * if no translation is available.
 */
export function useTranslatedName() {
  const { locale } = useI18n();

  return function getTranslatedName(entity: {
    name: string;
    translations?: TranslationMap;
  }): string {
    if (!entity.translations) return entity.name;
    return entity.translations[locale as keyof TranslationMap] || entity.name;
  };
}
