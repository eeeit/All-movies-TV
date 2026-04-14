import { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';

import { LanguageProvider } from '@/components/LanguageProvider';
import { SiteProvider } from '@/components/SiteProvider';
import { ThemeProvider } from '@/components/ThemeProvider';
import { apiClient } from '@/lib/api-client';
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  normalizeLocale,
} from '@/lib/i18n';

import AdminPage from '@/pages/AdminPage';
import DoubanPage from '@/pages/DoubanPage';
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/LoginPage';
import PlayPage from '@/pages/PlayPage';
import SearchPage from '@/pages/SearchPage';

interface RuntimeConfig {
  STORAGE_TYPE: string;
  ENABLE_REGISTER: boolean;
  IMAGE_PROXY: string;
  API_BASE_URL?: string;
}

type RuntimeWindow = Window & {
  RUNTIME_CONFIG?: RuntimeConfig;
};

export default function App() {
  const [siteName, setSiteName] = useState('天下影视');
  const [announcement, setAnnouncement] = useState('');
  const [configLoaded, setConfigLoaded] = useState(false);

  const initialLocale = normalizeLocale(
    localStorage.getItem(LOCALE_STORAGE_KEY) ?? undefined
  );

  useEffect(() => {
    apiClient
      .getServerConfig()
      .then((data) => {
        const nextSiteName = data.SiteName || '天下影视';
        const currentRuntimeConfig = (window as RuntimeWindow).RUNTIME_CONFIG;
        setSiteName(nextSiteName);
        setAnnouncement('');
        (window as RuntimeWindow).RUNTIME_CONFIG = {
          ...currentRuntimeConfig,
          STORAGE_TYPE:
            data.StorageType ||
            currentRuntimeConfig?.STORAGE_TYPE ||
            'localstorage',
          ENABLE_REGISTER: currentRuntimeConfig?.ENABLE_REGISTER ?? false,
          IMAGE_PROXY: currentRuntimeConfig?.IMAGE_PROXY || '',
        };
        document.title = nextSiteName;
      })
      .catch(() => {
        const currentRuntimeConfig = (window as RuntimeWindow).RUNTIME_CONFIG;
        (window as RuntimeWindow).RUNTIME_CONFIG = {
          ...currentRuntimeConfig,
          STORAGE_TYPE: currentRuntimeConfig?.STORAGE_TYPE || 'localstorage',
          ENABLE_REGISTER: currentRuntimeConfig?.ENABLE_REGISTER ?? false,
          IMAGE_PROXY: currentRuntimeConfig?.IMAGE_PROXY || '',
        };
      })
      .finally(() => {
        setConfigLoaded(true);
      });
  }, []);

  if (!configLoaded) {
    return (
      <div className='flex h-screen items-center justify-center bg-[#121212]'>
        <div className='h-8 w-8 animate-spin rounded-full border-2 border-[#d4af37] border-t-transparent' />
      </div>
    );
  }

  return (
    <ThemeProvider>
      <LanguageProvider initialLocale={initialLocale || DEFAULT_LOCALE}>
        <SiteProvider siteName={siteName} announcement={announcement}>
          <Routes>
            <Route path='/' element={<HomePage />} />
            <Route path='/search' element={<SearchPage />} />
            <Route path='/play' element={<PlayPage />} />
            <Route path='/douban' element={<DoubanPage />} />
            <Route path='/login' element={<LoginPage />} />
            <Route path='/admin' element={<AdminPage />} />
          </Routes>
        </SiteProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
