import React from 'react';
import { Languages } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

// বাংলা (প্রধান) | English (দ্বিতীয়) — লগইন পেজ ও হেডার দুই জায়গায় ব্যবহৃত
export const LanguageToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { lang, setLang, t } = useLanguage();
  return (
    <div
      role="group"
      aria-label={t('header.language')}
      className={`inline-flex items-center gap-1 rounded-lg border border-line bg-surface-raised p-0.5 text-sm ${className}`}
    >
      <Languages className="w-4 h-4 mx-1 text-fg-muted" aria-hidden="true" />
      {(['bn', 'en'] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          lang={code}
          className={`px-2.5 py-1 rounded-md font-semibold transition ${
            lang === code ? 'bg-primary text-on-primary' : 'text-fg-muted hover:text-fg'
          }`}
        >
          {code === 'bn' ? t('header.langBn') : t('header.langEn')}
        </button>
      ))}
    </div>
  );
};
