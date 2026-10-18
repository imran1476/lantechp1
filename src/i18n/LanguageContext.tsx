import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { bn, en, TKey } from './translations';

export type Lang = 'bn' | 'en';

interface LanguageValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TKey) => string;
}

const LanguageContext = createContext<LanguageValue | null>(null);

function initialLang(): Lang {
  try {
    const saved = window.localStorage.getItem('lang');
    if (saved === 'bn' || saved === 'en') return saved;
  } catch {
    // ব্রাউজার স্টোরেজ না থাকলেও ডিফল্ট বাংলা
  }
  return 'bn'; // বাংলা প্রধান ভাষা
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      window.localStorage.setItem('lang', lang);
    } catch {
      // উপেক্ষা
    }
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);
  const t = useCallback((key: TKey) => (lang === 'en' ? en[key] : bn[key]), [lang]);
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export function useLanguage(): LanguageValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage অবশ্যই LanguageProvider-এর ভেতরে ব্যবহার করতে হবে');
  return ctx;
}
