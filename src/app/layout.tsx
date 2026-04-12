import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { Inter } from 'next/font/google';

import './globals.css';
import 'sweetalert2/dist/sweetalert2.min.css';

import { getConfig } from '@/lib/config';
import {
  DEFAULT_LOCALE,
  getDocumentLang,
  LOCALE_STORAGE_KEY,
  normalizeLocale,
} from '@/lib/i18n';

import { LanguageProvider } from '../components/LanguageProvider';
import { SiteProvider } from '../components/SiteProvider';
import { ThemeProvider } from '../components/ThemeProvider';

const inter = Inter({ subsets: ['latin'] });

// 动态生成 metadata，支持配置更新后的标题变化
export async function generateMetadata(): Promise<Metadata> {
  let siteName = process.env.SITE_NAME || 'MoonTV';
  if (
    process.env.NEXT_PUBLIC_STORAGE_TYPE !== 'd1' &&
    process.env.NEXT_PUBLIC_STORAGE_TYPE !== 'upstash'
  ) {
    const config = await getConfig();
    siteName = config.SiteConfig.SiteName;
  }

  return {
    title: siteName,
    description: '影视聚合',
    manifest: '/manifest.json',
  };
}

export const viewport: Viewport = {
  themeColor: '#000000',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieLocale = normalizeLocale(
    cookies().get(LOCALE_STORAGE_KEY)?.value
  );
  let siteName = process.env.SITE_NAME || 'MoonTV';
  let announcement =
    process.env.ANNOUNCEMENT ||
    '本网站仅提供影视信息搜索服务，所有内容均来自第三方网站。本站不存储任何视频资源，不对任何内容的准确性、合法性、完整性负责。';
  let enableRegister = process.env.NEXT_PUBLIC_ENABLE_REGISTER === 'true';
  let imageProxy = process.env.NEXT_PUBLIC_IMAGE_PROXY || '';
  if (
    process.env.NEXT_PUBLIC_STORAGE_TYPE !== 'd1' &&
    process.env.NEXT_PUBLIC_STORAGE_TYPE !== 'upstash'
  ) {
    const config = await getConfig();
    siteName = config.SiteConfig.SiteName;
    announcement = config.SiteConfig.Announcement;
    enableRegister = config.UserConfig.AllowRegister;
    imageProxy = config.SiteConfig.ImageProxy;
  }

  // 将运行时配置注入到全局 window 对象，供客户端在运行时读取
  const runtimeConfig = {
    STORAGE_TYPE: process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage',
    ENABLE_REGISTER: enableRegister,
    IMAGE_PROXY: imageProxy,
  };

  return (
    <html
      lang={getDocumentLang(cookieLocale || DEFAULT_LOCALE)}
      suppressHydrationWarning
    >
      <head>
        {/* 兼容部分运行时将函数名辅助器注入到内联脚本场景 */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'window.__name = window.__name || function (fn) { return fn; };',
          }}
        />
        {/* 将配置序列化后直接写入脚本，浏览器端可通过 window.RUNTIME_CONFIG 获取 */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.RUNTIME_CONFIG = ${JSON.stringify(runtimeConfig)};`,
          }}
        />
      </head>
      <body
        className={`${inter.className} min-h-screen bg-[#121212] text-neutral-100`}
      >
        <ThemeProvider
          attribute='class'
          defaultTheme='system'
          enableSystem
          disableTransitionOnChange
        >
          <LanguageProvider initialLocale={cookieLocale || DEFAULT_LOCALE}>
            <SiteProvider siteName={siteName} announcement={announcement}>
              {children}
            </SiteProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
