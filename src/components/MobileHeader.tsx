'use client';

import { Play } from 'lucide-react';
import Link from 'next/link';

import { BackButton } from './BackButton';
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
    <header className='md:hidden sticky top-0 z-40 w-full border-b border-white/10 bg-[#0f0f0f]/95 backdrop-blur-xl'>
      <div className='flex h-[3.75rem] items-center justify-between px-3.5'>
        <div className='flex items-center gap-2'>
          {showBackButton && <BackButton />}
          <Link
            href='/'
            className='flex items-center gap-2 text-neutral-100 transition-colors hover:text-[#d4af37]'
          >
            <span className='inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#d4af37] to-[#b39028] text-black'>
              <Play className='h-4 w-4 fill-black' />
            </span>
            <span className='text-[17px] font-bold tracking-[0.04em]'>
              {siteName}
            </span>
          </Link>
        </div>

        <div className='flex items-center gap-1.5'>
          <LanguageToggle />
          <ThemeToggle />
          <SettingsButton />
        </div>
      </div>
    </header>
  );
};

export default MobileHeader;
