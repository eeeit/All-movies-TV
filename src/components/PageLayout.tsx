import { BackButton } from './BackButton';
import { LogoutButton } from './LogoutButton';
import { LanguageToggle } from './LanguageToggle';
import MobileBottomNav from './MobileBottomNav';
import MobileHeader from './MobileHeader';
import { SettingsButton } from './SettingsButton';
import Sidebar from './Sidebar';
import { ThemeToggle } from './ThemeToggle';
import Link from 'next/link';
import { Search } from 'lucide-react';

interface PageLayoutProps {
  children: React.ReactNode;
  activePath?: string;
}

const PageLayout = ({ children, activePath = '/' }: PageLayoutProps) => {
  return (
    <div className='w-full min-h-screen bg-[#121212] text-neutral-100'>
      {/* 移动端头部 */}
      <MobileHeader showBackButton={['/play'].includes(activePath)} />

      {/* 桌面端顶部导航（参考 UI 设计） */}
      <div className='hidden md:flex items-center justify-between px-6 py-3 border-b border-white/5 top-desktop-header z-20'>
        <div className='flex items-center gap-4'>
          <Link href='/' className='text-2xl font-bold text-[#f0b90b]'>
            MoonTV
          </Link>
        </div>

        <div className='flex-1 flex justify-center'>
          <div className='w-full max-w-2xl'>
            <div className='relative'>
              <input
                aria-label='搜索'
                placeholder='搜索影视、演员、导演...'
                className='w-full rounded-full bg-[#0f0f0f]/60 border border-white/6 px-4 py-2 text-sm placeholder:text-neutral-400 focus:outline-none'
              />
              <button className='absolute right-1 top-1/2 -translate-y-1/2 p-2 rounded-full bg-[#f0b90b] text-black'>
                <Search className='h-4 w-4' />
              </button>
            </div>
          </div>
        </div>

        <div className='flex items-center gap-2'>
          <LanguageToggle />
          <ThemeToggle />
          <SettingsButton />
          <LogoutButton />
        </div>
      </div>

      {/* 主要布局容器 */}
      <div className='flex md:grid md:grid-cols-[auto_1fr] w-full min-h-screen md:min-h-auto'>
        {/* 侧边栏 - 桌面端显示，移动端隐藏 */}
        <div className='hidden md:block'>
          <Sidebar activePath={activePath} />
        </div>

        {/* 主内容区域 */}
        <div className='relative min-w-0 flex-1 transition-all duration-300'>
          {/* 桌面端左上角返回按钮 */}
          {['/play'].includes(activePath) && (
            <div className='absolute top-3 left-1 z-20 hidden md:flex'>
              <BackButton />
            </div>
          )}

          {/* 桌面端顶部按钮 */}
          <div className='absolute top-2 right-4 z-20 hidden md:flex items-center gap-2'>
            <SettingsButton />
            <LogoutButton />
            <LanguageToggle />
            <ThemeToggle />
          </div>

          {/* 主内容 */}
          <main
            className='flex-1 md:min-h-0 mb-14 md:mb-0'
            style={{
              paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom))',
            }}
          >
            <div className='content-container'>{children}</div>
          </main>
        </div>
      </div>

      {/* 移动端底部导航 */}
      <div className='md:hidden'>
        <MobileBottomNav activePath={activePath} />
      </div>
    </div>
  );
};

export default PageLayout;
