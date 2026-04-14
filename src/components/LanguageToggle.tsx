'use client';

import { useLanguage } from './LanguageProvider';

export const LanguageToggle = () => {
  const { locale, setLocale, t } = useLanguage();

  return (
    <div
      className='inline-flex items-center rounded-full border border-white/12 bg-white/5 p-0.5 shadow-[0_10px_30px_rgba(0,0,0,0.2)]'
      aria-label={t('switchLanguage')}
    >
      <button
        type='button'
        onClick={() => setLocale('zh')}
        className={`rounded-full px-2 py-1 text-[10px] sm:px-2.5 sm:text-[11px] font-semibold uppercase tracking-widest sm:tracking-[0.18em] transition-colors ${
          locale === 'zh'
            ? 'bg-[#d4af37] text-black shadow-[0_8px_24px_rgba(212,175,55,0.28)]'
            : 'text-neutral-400 hover:text-neutral-100'
        }`}
      >
        CN
      </button>
      <button
        type='button'
        onClick={() => setLocale('en')}
        className={`rounded-full px-2 py-1 text-[10px] sm:px-2.5 sm:text-[11px] font-semibold uppercase tracking-widest sm:tracking-[0.18em] transition-colors ${
          locale === 'en'
            ? 'bg-[#d4af37] text-black shadow-[0_8px_24px_rgba(212,175,55,0.28)]'
            : 'text-neutral-400 hover:text-neutral-100'
        }`}
      >
        EN
      </button>
    </div>
  );
};
