import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { cookies } from 'next/headers';

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
  let siteName = process.env.SITE_NAME || '天下影视';
  if (process.env.NEXT_PUBLIC_STORAGE_TYPE !== 'upstash') {
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
  let siteName = process.env.SITE_NAME || '天下影视';
  let announcement =
    process.env.ANNOUNCEMENT ||
    '本网站仅提供影视信息搜索服务，所有内容均来自第三方网站。本站不存储任何视频资源，不对任何内容的准确性、合法性、完整性负责。';
  let enableRegister = process.env.NEXT_PUBLIC_ENABLE_REGISTER === 'true';
  let imageProxy = process.env.NEXT_PUBLIC_IMAGE_PROXY || '';
  if (process.env.NEXT_PUBLIC_STORAGE_TYPE !== 'upstash') {
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
        {/* 当 Service Worker 缓存了旧版本资源、导致重新部署后出现 ChunkLoadError 时，自动清理缓存并刷新一次 */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function () {
  var RELOAD_KEY = '__chunk_reload_at';
  function isChunkLoadError(value) {
    if (!value) return false;
    var name = value.name || '';
    var message = value.message || String(value);
    return (
      name === 'ChunkLoadError' ||
      /Loading chunk [\\d]+ failed/i.test(message) ||
      /Loading CSS chunk/i.test(message) ||
      /Failed to fetch dynamically imported module/i.test(message)
    );
  }
  function recover() {
    try {
      var last = Number(sessionStorage.getItem(RELOAD_KEY) || '0');
      // 60 秒内只自动刷新一次，避免在资源彻底缺失时陷入刷新循环
      if (Date.now() - last < 60000) return;
      sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    } catch (e) {
      // sessionStorage 不可用时直接刷新一次
    }
    var done = function () {
      window.location.reload();
    };
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then(function (regs) {
          return Promise.all(regs.map(function (r) { return r.unregister(); }));
        })
        .catch(function () {})
        .then(function () {
          if (window.caches && caches.keys) {
            return caches
              .keys()
              .then(function (keys) {
                return Promise.all(keys.map(function (k) { return caches.delete(k); }));
              })
              .catch(function () {});
          }
        })
        .catch(function () {})
        .then(done, done);
    } else {
      done();
    }
  }
  window.addEventListener('error', function (event) {
    if (isChunkLoadError(event && event.error)) recover();
  });
  window.addEventListener('unhandledrejection', function (event) {
    if (isChunkLoadError(event && event.reason)) recover();
  });
})();`,
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
