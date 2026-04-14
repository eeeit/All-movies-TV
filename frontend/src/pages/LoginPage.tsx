import type { FormEvent } from 'react';
import { useState } from 'react';

import AppShell from '@/components/AppShell';
import { useLanguage } from '@/components/LanguageProvider';
import { useSite } from '@/components/SiteProvider';
import { apiClient } from '@/lib/api-client';
import { saveAuthInfo } from '@/lib/auth';

interface RuntimeConfig {
  STORAGE_TYPE?: string;
}

type RuntimeWindow = Window & {
  RUNTIME_CONFIG?: RuntimeConfig;
};

export default function LoginPage() {
  const { t } = useLanguage();
  const { siteName } = useSite();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loadingAction, setLoadingAction] = useState<
    'login' | 'register' | null
  >(null);
  const [error, setError] = useState('');

  const storageType =
    typeof window === 'undefined'
      ? 'localstorage'
      : (window as RuntimeWindow).RUNTIME_CONFIG?.STORAGE_TYPE ||
        'localstorage';
  const credentialMode = storageType !== 'localstorage';

  const finishAuth = () => {
    window.location.href = '/';
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setLoadingAction('login');
    setError('');

    try {
      const response = credentialMode
        ? await apiClient.login({ username: username.trim(), password })
        : await apiClient.login({ password });

      saveAuthInfo(response.auth);

      finishAuth();
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : t('operationFailed')
      );
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRegister = async () => {
    setLoadingAction('register');
    setError('');

    try {
      const response = await apiClient.register({
        username: username.trim(),
        password,
      });

      saveAuthInfo(response.auth);
      finishAuth();
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : t('operationFailed')
      );
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <AppShell>
      <section className='mx-auto max-w-lg py-10'>
        <div className='rounded-[2rem] border border-white/10 bg-[#101010]/75 p-6 shadow-[0_32px_64px_rgba(0,0,0,0.32)] backdrop-blur-xl sm:p-8'>
          <div className='mb-8 text-center'>
            <h1 className='text-3xl font-black tracking-[0.14em] text-white'>
              {siteName}
            </h1>
          </div>

          <form onSubmit={handleLogin} className='space-y-4'>
            {credentialMode ? (
              <input
                type='text'
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder={t('enterUsername')}
                className='h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none transition-colors placeholder:text-neutral-500 focus:border-[#d4af37]/45 focus:bg-black/45'
              />
            ) : null}

            <input
              type='password'
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={
                credentialMode ? t('enterPassword') : t('enterAccessPassword')
              }
              className='h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none transition-colors placeholder:text-neutral-500 focus:border-[#d4af37]/45 focus:bg-black/45'
            />

            {error ? (
              <div className='rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200'>
                {error}
              </div>
            ) : null}

            <div className='flex flex-col gap-3 sm:flex-row'>
              <button
                type='submit'
                disabled={loadingAction !== null}
                className='h-12 flex-1 rounded-2xl bg-[#f0b90b] text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60'
              >
                {loadingAction === 'login' ? t('loginInProgress') : t('login')}
              </button>

              {credentialMode ? (
                <button
                  type='button'
                  disabled={loadingAction !== null}
                  onClick={() => {
                    void handleRegister();
                  }}
                  className='h-12 flex-1 rounded-2xl border border-white/10 bg-white/6 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60'
                >
                  {loadingAction === 'register'
                    ? t('registerInProgress')
                    : t('register')}
                </button>
              ) : null}
            </div>
          </form>
        </div>
      </section>
    </AppShell>
  );
}
