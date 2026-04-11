'use client';

import { useLanguage } from './LanguageProvider';

export const LanguageToggle = () => {
  const { locale, setLocale, t } = useLanguage();

  return (
    <div
      className='inline-flex items-center rounded-full border border-white/8 bg-white/5 p-0.5 shadow-[0_10px_30px_rgba(0,0,0,0.2)]'
      aria-label={t('switchLanguage')}
    >
      <button
        type='button'
        onClick={() => setLocale('zh')}
        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors sm:text-xs ${
          locale === 'zh'
            ? 'bg-[#f0b90b] text-black shadow-[0_8px_24px_rgba(240,185,11,0.28)]'
            : 'text-neutral-400 hover:text-neutral-100'
        }`}
      >
        CN
      </button>
      <button
        type='button'
        onClick={() => setLocale('en')}
        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors sm:text-xs ${
          locale === 'en'
            ? 'bg-[#f0b90b] text-black shadow-[0_8px_24px_rgba(240,185,11,0.28)]'
            : 'text-neutral-400 hover:text-neutral-100'
        }`}
      >
        EN
      </button>
    </div>
  );
};
