/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import BrandLogo from '@/components/BrandLogo';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useLanguage } from '@/components/LanguageProvider';
import { ThemeToggle } from '@/components/ThemeToggle';

function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shouldAskUsername, setShouldAskUsername] = useState(false);
  const [enableRegister, setEnableRegister] = useState(false);

  // 在客户端挂载后设置配置
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storageType = (window as any).RUNTIME_CONFIG?.STORAGE_TYPE;
      setShouldAskUsername(storageType && storageType !== 'localstorage');
      setEnableRegister(
        Boolean((window as any).RUNTIME_CONFIG?.ENABLE_REGISTER)
      );
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!password || (shouldAskUsername && !username)) return;

    try {
      setLoading(true);
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          ...(shouldAskUsername ? { username } : {}),
        }),
      });

      if (res.ok) {
        const redirect = searchParams.get('redirect') || '/';
        router.replace(redirect);
      } else if (res.status === 401) {
        setError(t('passwordWrong'));
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? t('serverError'));
      }
    } catch (error) {
      setError(t('networkError'));
    } finally {
      setLoading(false);
    }
  };

  // 处理注册逻辑
  const handleRegister = async () => {
    setError(null);
    if (!password || !username) return;

    try {
      setLoading(true);
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        const redirect = searchParams.get('redirect') || '/';
        router.replace(redirect);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? t('serverError'));
      }
    } catch (error) {
      setError(t('networkError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='relative min-h-screen flex items-center justify-center px-4 overflow-hidden bg-[#121212] text-neutral-100'>
      <div className='absolute top-4 right-4'>
        <div className='flex items-center gap-2'>
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
      <div className='absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(23,47,59,0.45),_transparent_40%),radial-gradient(circle_at_80%_20%,_rgba(240,185,11,0.08),_transparent_25%)]' />
      <div className='relative z-10 w-full max-w-md rounded-3xl bg-[#161616]/95 border border-white/8 backdrop-blur-xl shadow-[0_28px_90px_rgba(0,0,0,0.55)] p-10'>
        <BrandLogo
          href=''
          className='mx-auto mb-8 w-[250px]'
          imageClassName='rounded-sm'
          priority
          sizes='250px'
        />
        <form onSubmit={handleSubmit} className='space-y-8'>
          {shouldAskUsername && (
            <div>
              <label htmlFor='username' className='sr-only'>
                {t('username')}
              </label>
              <input
                id='username'
                type='text'
                autoComplete='username'
                className='block w-full rounded-lg border border-white/8 py-3 px-4 text-neutral-100 shadow-sm bg-white/5 placeholder:text-neutral-500 focus:ring-2 focus:ring-[#f0b90b]/40 focus:outline-none sm:text-base backdrop-blur'
                placeholder={t('enterUsername')}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          )}

          <div>
            <label htmlFor='password' className='sr-only'>
              {t('password')}
            </label>
            <input
              id='password'
              type='password'
              autoComplete='current-password'
              className='block w-full rounded-lg border border-white/8 py-3 px-4 text-neutral-100 shadow-sm bg-white/5 placeholder:text-neutral-500 focus:ring-2 focus:ring-[#f0b90b]/40 focus:outline-none sm:text-base backdrop-blur'
              placeholder={t('enterAccessPassword')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className='text-sm text-red-400'>{error}</p>}

          {/* 登录 / 注册按钮 */}
          {shouldAskUsername && enableRegister ? (
            <div className='flex gap-4'>
              <button
                type='button'
                onClick={handleRegister}
                disabled={!password || !username || loading}
                className='flex-1 inline-flex justify-center rounded-lg bg-white/8 py-3 text-base font-semibold text-neutral-100 shadow-lg border border-white/8 transition-all duration-200 hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-50'
              >
                {loading ? t('registerInProgress') : t('register')}
              </button>
              <button
                type='submit'
                disabled={
                  !password || loading || (shouldAskUsername && !username)
                }
                className='flex-1 inline-flex justify-center rounded-lg bg-[#f0b90b] py-3 text-base font-semibold text-black shadow-lg transition-all duration-200 hover:bg-[#d9a90a] disabled:cursor-not-allowed disabled:opacity-50'
              >
                {loading ? t('loginInProgress') : t('login')}
              </button>
            </div>
          ) : (
            <button
              type='submit'
              disabled={
                !password || loading || (shouldAskUsername && !username)
              }
              className='inline-flex w-full justify-center rounded-lg bg-[#f0b90b] py-3 text-base font-semibold text-black shadow-lg transition-all duration-200 hover:bg-[#d9a90a] disabled:cursor-not-allowed disabled:opacity-50'
            >
              {loading ? t('loginInProgress') : t('login')}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginPageClient />
    </Suspense>
  );
}
