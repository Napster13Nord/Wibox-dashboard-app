"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { en } from '@/locales/en';
import { sv } from '@/locales/sv';
import { fi } from '@/locales/fi';

export type Locale = 'en' | 'sv' | 'fi';
export type Translations = typeof en;

const dictionaries: Record<Locale, Translations> = { en, sv, fi };

export const localeLabels: Record<Locale, { flag: string; label: string }> = {
  en: { flag: '🇬🇧', label: 'English' },
  sv: { flag: '🇸🇪', label: 'Svenska' },
  fi: { flag: '🇫🇮', label: 'Suomi' },
};

type I18nContextType = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Translations;
};

const I18nContext = createContext<I18nContextType>({
  locale: 'en',
  setLocale: () => {},
  t: en,
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('wibox-locale') as Locale) || 'en';
    }
    return 'en';
  });

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem('wibox-locale', l);
  }, []);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t: dictionaries[locale] }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);
