import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

import { getAuthInfoFromBrowserCookie } from '@/lib/auth';

import { BackButton } from './BackButton';
import BrandLogo from './BrandLogo';
import { LanguageToggle } from './LanguageToggle';
import { useLanguage } from './LanguageProvider';
import { LogoutButton } from './LogoutButton';
import MobileHeader from './MobileHeader';
import { SettingsButton } from './SettingsButton';
import { useSite } from './SiteProvider';
import { ThemeToggle } from './ThemeToggle';

interface AppShellProps {
  children: ReactNode;
  showBackButton?: boolean;
}

function getNavClass(isActive: boolean) {
  return `rounded-full px-4 py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-[#f0b90b] text-black shadow-[0_12px_28px_rgba(240,185,11,0.28)]'
      : 'text-neutral-300 hover:bg-white/8 hover:text-white'
  }`;
}

export default function AppShell({
  children,
  showBackButton = false,
}: AppShellProps) {
  const { t } = useLanguage();
  const { announcement } = useSite();
  const authInfo =
    typeof document === 'undefined' ? null : getAuthInfoFromBrowserCookie();

  const navItems = [
    { to: '/', label: t('home') },
    { to: '/search', label: t('search') },
    { to: '/douban', label: t('featured') },
    { to: '/admin', label: t('adminSettings') },
  ];

  return (
    <div className='min-h-screen pb-16'>
      <MobileHeader showBackButton={showBackButton} />

      <div className='content-container'>
        <header className='sticky top-4 z-30 hidden md:block'>
          <div className='flex items-center justify-between rounded-[1.75rem] border border-white/10 bg-[#090909]/80 px-5 py-4 shadow-[0_30px_60px_rgba(0,0,0,0.28)] backdrop-blur-2xl'>
            <div className='flex items-center gap-4'>
              {showBackButton ? <BackButton /> : null}
              <BrandLogo className='min-w-[170px]' />

              <nav className='flex items-center gap-2'>
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => getNavClass(isActive)}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </div>

            <div className='flex items-center gap-2'>
              {authInfo?.username ? (
                <span className='rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-neutral-200'>
                  {authInfo.username}
                </span>
              ) : (
                <NavLink
                  to='/login'
                  className={({ isActive }) => getNavClass(isActive)}
                >
                  {t('login')}
                </NavLink>
              )}
              <LanguageToggle />
              <ThemeToggle />
              <SettingsButton />
              {authInfo ? <LogoutButton /> : null}
            </div>
          </div>

          {announcement ? (
            <div className='mt-3 rounded-2xl border border-[#d4af37]/20 bg-[#111111]/75 px-5 py-3 text-sm text-neutral-300 shadow-[0_18px_38px_rgba(0,0,0,0.2)] backdrop-blur-xl'>
              {announcement}
            </div>
          ) : null}
        </header>

        {announcement ? (
          <div className='pt-4 md:hidden'>
            <div className='rounded-2xl border border-[#d4af37]/20 bg-[#111111]/70 px-4 py-3 text-sm text-neutral-300 shadow-[0_18px_38px_rgba(0,0,0,0.2)] backdrop-blur-xl'>
              {announcement}
            </div>
          </div>
        ) : null}

        <main className='pt-4 md:pt-8'>{children}</main>
      </div>
    </div>
  );
}
