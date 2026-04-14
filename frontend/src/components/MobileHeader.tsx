'use client';

import { BackButton } from './BackButton';
import BrandLogo from './BrandLogo';
import { LanguageToggle } from './LanguageToggle';
import { SettingsButton } from './SettingsButton';
import { ThemeToggle } from './ThemeToggle';

interface MobileHeaderProps {
  showBackButton?: boolean;
}

const MobileHeader = ({ showBackButton = false }: MobileHeaderProps) => {
  return (
    <header className='md:hidden sticky top-0 z-40 w-full border-b border-white/10 bg-[#0f0f0f]/95 backdrop-blur-xl'>
      <div className='flex h-[3.75rem] items-center justify-between px-3.5'>
        <div className='flex items-center gap-2'>
          {showBackButton && <BackButton />}
          <BrandLogo
            className='w-[124px] sm:w-[148px]'
            imageClassName='rounded-sm'
            priority
            sizes='(max-width: 640px) 124px, 148px'
          />
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
