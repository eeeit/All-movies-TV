import Link from 'next/link';
import { Play, Search } from 'lucide-react';

import { BackButton } from './BackButton';
import { LanguageToggle } from './LanguageToggle';
import { LogoutButton } from './LogoutButton';
import MobileBottomNav from './MobileBottomNav';
import MobileHeader from './MobileHeader';
import { SettingsButton } from './SettingsButton';
import { ThemeToggle } from './ThemeToggle';

interface PageLayoutProps {
  children: React.ReactNode;
  activePath?: string;
}

const PageLayout = ({ children, activePath = '/' }: PageLayoutProps) => {
  const navItems = [
    { href: '/', label: '首页' },
    { href: '/search', label: '搜索' },
    { href: '/douban?type=movie', label: '电影' },
    { href: '/douban?type=tv', label: '剧集' },
    { href: '/douban?type=show', label: '综艺' },
  ];

  const isNavActive = (href: string) => {
    if (href === '/') return activePath === '/';
    if (href.startsWith('/douban')) {
      const match = href.match(/type=([^&]+)/);
      const type = match?.[1];
      return (
        activePath.startsWith('/douban') &&
        Boolean(type && activePath.includes(`type=${type}`))
      );
    }

    return activePath.startsWith(href);
  };

  return (
    <div className='w-full min-h-screen bg-[#0f0f0f] text-neutral-100'>
      {/* 移动端头部 */}
      <MobileHeader showBackButton={['/play'].includes(activePath)} />

      {/* 桌面端顶部导航 */}
      <header className='hidden md:block sticky top-0 z-40 border-b border-white/10 bg-[#0f0f0f]/90 backdrop-blur-md'>
        <div className='mx-auto max-w-[1600px] px-4 lg:px-6'>
          <div className='flex h-[4.25rem] items-center justify-between gap-5 lg:gap-6'>
            <Link
              href='/'
              className='flex items-center gap-2 text-white transition-colors hover:text-[#d4af37]'
            >
              <span className='inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#d4af37] to-[#b39028] text-black'>
                <Play className='h-4 w-4 fill-black' />
              </span>
              <span className='text-[22px] font-bold tracking-[0.06em]'>
                MoonTV
              </span>
            </Link>

            <form
              action='/search'
              className='relative w-full max-w-[34rem] flex-1'
            >
              <input
                aria-label='搜索'
                type='search'
                name='q'
                placeholder='搜索影视...'
                className='w-full rounded-full border border-white/12 bg-[#1a1a1a] py-2.5 pl-4 pr-12 text-[15px] text-neutral-100 placeholder:text-neutral-500 focus:border-[#d4af37] focus:outline-none'
              />
              <button
                type='submit'
                className='absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-[#d4af37] p-2 text-black transition-colors hover:bg-[#c19a2f]'
              >
                <Search className='h-4 w-4' />
              </button>
            </form>

            <div className='flex items-center gap-1.5'>
              <LanguageToggle />
              <ThemeToggle />
              <SettingsButton />
              <LogoutButton />
            </div>
          </div>

          <nav className='flex h-12 items-center gap-1.5'>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                data-active={isNavActive(item.href)}
                className='rounded-full border border-transparent px-3.5 py-1.5 text-[13px] lg:text-sm text-neutral-400 transition-colors hover:text-neutral-100 data-[active=true]:border-[#d4af37]/45 data-[active=true]:bg-[#d4af37]/10 data-[active=true]:text-[#d4af37]'
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <div className='relative w-full'>
        {['/play'].includes(activePath) && (
          <div className='absolute left-4 top-20 z-20 hidden md:flex'>
            <BackButton />
          </div>
        )}

        <main
          className='mb-14 md:mb-0'
          style={{
            paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom))',
          }}
        >
          <div className='content-container'>{children}</div>
        </main>
      </div>

      {/* 移动端底部导航 */}
      <div className='md:hidden'>
        <MobileBottomNav activePath={activePath} />
      </div>
    </div>
  );
};

export default PageLayout;
