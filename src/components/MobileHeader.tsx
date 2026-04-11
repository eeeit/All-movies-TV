'use client';

import Link from 'next/link';

import { BackButton } from './BackButton';
import { LogoutButton } from './LogoutButton';
import { LanguageToggle } from './LanguageToggle';
import { SettingsButton } from './SettingsButton';
import { useSite } from './SiteProvider';
import { ThemeToggle } from './ThemeToggle';

interface MobileHeaderProps {
  showBackButton?: boolean;
}

const MobileHeader = ({ showBackButton = false }: MobileHeaderProps) => {
  const { siteName } = useSite();
  return (
    <header className='md:hidden relative w-full bg-[#121212]/90 backdrop-blur-xl border-b border-white/5 shadow-sm'>
      <div className='h-12 flex items-center justify-between px-4'>
        {/* 左侧：返回按钮和设置按钮 */}
        <div className='flex items-center gap-2'>
          {showBackButton && <BackButton />}
          <SettingsButton />
        </div>

        {/* 右侧按钮 */}
        <div className='flex items-center gap-2'>
          <LogoutButton />
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>

      {/* 中间：Logo（绝对居中） */}
      <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'>
        <Link
          href='/'
          className='text-2xl font-bold text-[#f0b90b] tracking-tight hover:opacity-80 transition-opacity'
        >
          {siteName}
        </Link>
      </div>
    </header>
  );
};

export default MobileHeader;
