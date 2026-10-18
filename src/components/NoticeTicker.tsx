import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';

export const NoticeTicker: React.FC = () => {
  const { t } = useLanguage();
  const notices = [t('notice.1'), t('notice.2')];
  return (
    <section className="notice-ticker" aria-label={t('notice.aria')}>
      <strong className="notice-label">{t('notice.label')}</strong>
      <div className="notice-viewport" tabIndex={0} aria-label={notices.join(' ')}>
        <div className="notice-track" aria-hidden="true">
          {[0, 1].map((copy) => (
            <div className="notice-cycle" key={copy} aria-hidden={copy === 1 ? true : undefined}>
              {notices.map((notice) => <span className="notice-item" key={notice}>{notice}</span>)}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
