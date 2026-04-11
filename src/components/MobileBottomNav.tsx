'use client';

import { Clover, Film, Home, Search, Tv } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useLanguage } from './LanguageProvider';

interface MobileBottomNavProps {
  /**
   * 主动指定当前激活的路径。当未提供时，自动使用 usePathname() 获取的路径。
   */
  activePath?: string;
}

const MobileBottomNav = ({ activePath }: MobileBottomNavProps) => {
  const pathname = usePathname();
  const { t } = useLanguage();

  // 当前激活路径：优先使用传入的 activePath，否则回退到浏览器地址
  const currentActive = activePath ?? pathname;

  const navItems = [
    { icon: Home, label: t('home'), href: '/' },
    { icon: Search, label: t('search'), href: '/search' },
    {
      icon: Film,
      label: t('movie'),
      href: '/douban?type=movie',
    },
    {
      icon: Tv,
      label: t('tv'),
      href: '/douban?type=tv',
    },
    {
      icon: Clover,
      label: t('variety'),
      href: '/douban?type=show',
    },
  ];

  const isActive = (href: string) => {
    const typeMatch = href.match(/type=([^&]+)/)?.[1];

    // 解码URL以进行正确的比较
    const decodedActive = decodeURIComponent(currentActive);
    const decodedItemHref = decodeURIComponent(href);

    return (
      decodedActive === decodedItemHref ||
      (decodedActive.startsWith('/douban') &&
        decodedActive.includes(`type=${typeMatch}`))
    );
  };

  return (
    <nav
      className='md:hidden fixed left-0 right-0 z-[600] bg-[#121212]/95 backdrop-blur-xl border-t border-white/5 overflow-hidden shadow-[0_-16px_50px_rgba(0,0,0,0.35)]'
      style={{
        /* 紧贴视口底部，同时在内部留出安全区高度 */
        bottom: 0,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <ul className='flex items-center'>
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href} className='flex-shrink-0 w-1/5'>
              <Link
                href={item.href}
                className='flex flex-col items-center justify-center w-full h-14 gap-1 text-xs'
              >
                <item.icon
                  className={`h-6 w-6 ${
                    active ? 'text-[#f0b90b]' : 'text-neutral-500'
                  }`}
                />
                <span
                  className={active ? 'text-[#f0b90b]' : 'text-neutral-400'}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default MobileBottomNav;
