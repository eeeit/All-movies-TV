import { useEffect, useState } from 'react';

import type { AdminConfigResult } from '@shared/api-contract';

import AppShell from '@/components/AppShell';
import { useLanguage } from '@/components/LanguageProvider';
import { apiClient } from '@/lib/api-client';

function translateRole(role: string, t: (key: string) => string) {
  if (role === 'owner') {
    return t('owner');
  }

  if (role === 'admin') {
    return t('admin');
  }

  return t('user');
}

export default function AdminPage() {
  const { t } = useLanguage();
  const [data, setData] = useState<AdminConfigResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError('');

    apiClient
      .getAdminConfig()
      .then((response) => {
        if (!cancelled) {
          setData(response);
        }
      })
      .catch((nextError) => {
        if (!cancelled) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : t('operationFailed')
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

  return (
    <AppShell>
      {loading ? (
        <div className='flex min-h-[40vh] items-center justify-center'>
          <div className='h-10 w-10 animate-spin rounded-full border-2 border-[#d4af37] border-t-transparent' />
        </div>
      ) : error ? (
        <div className='rounded-[2rem] border border-red-500/20 bg-red-500/10 px-5 py-12 text-center text-red-200'>
          {error}
        </div>
      ) : data ? (
        <div className='space-y-6'>
          <section className='grid gap-4 lg:grid-cols-[0.9fr_1.1fr]'>
            <div className='rounded-[2rem] border border-white/10 bg-[#101010]/75 p-6 shadow-[0_32px_64px_rgba(0,0,0,0.32)] backdrop-blur-xl'>
              <div className='space-y-4'>
                <h1 className='text-3xl font-black text-white'>
                  {t('adminSettings')}
                </h1>

                <div className='flex flex-wrap gap-2'>
                  <span className='rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-3 py-1.5 text-sm font-medium text-[#f0b90b]'>
                    {translateRole(data.Role, t)}
                  </span>
                  <span className='rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-sm text-neutral-200'>
                    {t('totalUsers')}: {data.Config.UserConfig.Users.length}
                  </span>
                </div>

                <div className='rounded-[1.5rem] border border-white/10 bg-black/25 p-4 text-sm text-neutral-300'>
                  {data.Config.SiteConfig.Announcement || t('siteAnnouncement')}
                </div>
              </div>
            </div>

            <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-5'>
              {[
                {
                  label: t('siteName'),
                  value: data.Config.SiteConfig.SiteName,
                },
                {
                  label: t('searchApiMaxPage'),
                  value: String(data.Config.SiteConfig.SearchDownstreamMaxPage),
                },
                {
                  label: t('siteInterfaceCacheTime'),
                  value: String(data.Config.SiteConfig.SiteInterfaceCacheTime),
                },
                {
                  label: t('allowUserRegistration'),
                  value: data.Config.UserConfig.AllowRegister
                    ? t('enabled')
                    : t('disabled'),
                },
                {
                  label: t('imageProxyPrefix'),
                  value: data.Config.SiteConfig.ImageProxy || '-',
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className='rounded-[1.5rem] border border-white/10 bg-[#101010]/75 p-4 shadow-[0_22px_44px_rgba(0,0,0,0.2)] backdrop-blur-xl'
                >
                  <div className='text-xs font-semibold tracking-[0.2em] text-[#f0b90b]'>
                    {item.label}
                  </div>
                  <div className='mt-3 break-all text-sm font-semibold text-white'>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className='grid gap-6 xl:grid-cols-[0.85fr_1.15fr]'>
            <div className='rounded-[2rem] border border-white/10 bg-[#101010]/75 p-6 shadow-[0_28px_56px_rgba(0,0,0,0.28)] backdrop-blur-xl'>
              <div className='mb-5 flex items-center justify-between'>
                <h2 className='text-xl font-bold text-white'>
                  {t('userList')}
                </h2>
                <span className='text-sm text-neutral-400'>
                  {t('totalUsers')}: {data.Config.UserConfig.Users.length}
                </span>
              </div>

              <div className='space-y-3'>
                {data.Config.UserConfig.Users.map((user) => (
                  <div
                    key={user.username}
                    className='rounded-[1.35rem] border border-white/10 bg-white/5 p-4'
                  >
                    <div className='flex flex-wrap items-center justify-between gap-3'>
                      <div className='text-sm font-semibold text-white'>
                        {user.username}
                      </div>
                      <div className='flex flex-wrap gap-2'>
                        <span className='rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs text-neutral-200'>
                          {translateRole(user.role, t)}
                        </span>
                        <span className='rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs text-neutral-200'>
                          {user.banned ? t('banned') : t('normal')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className='rounded-[2rem] border border-white/10 bg-[#101010]/75 p-6 shadow-[0_28px_56px_rgba(0,0,0,0.28)] backdrop-blur-xl'>
              <div className='mb-5 flex items-center justify-between'>
                <h2 className='text-xl font-bold text-white'>
                  {t('videoSourceList')}
                </h2>
                <span className='text-sm text-neutral-400'>
                  {data.Config.SourceConfig.length}
                </span>
              </div>

              <div className='space-y-3'>
                {data.Config.SourceConfig.map((source) => (
                  <div
                    key={source.key}
                    className='rounded-[1.35rem] border border-white/10 bg-white/5 p-4'
                  >
                    <div className='flex flex-wrap items-center justify-between gap-3'>
                      <div>
                        <div className='text-sm font-semibold text-white'>
                          {source.name}
                        </div>
                        <div className='mt-1 text-xs text-neutral-500'>
                          {source.key}
                        </div>
                      </div>

                      <span className='rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs text-neutral-200'>
                        {source.disabled ? t('disabled') : t('enabled')}
                      </span>
                    </div>

                    <div className='mt-3 space-y-1 text-xs text-neutral-400'>
                      <div className='break-all'>{source.api}</div>
                      {source.detail ? (
                        <div className='break-all'>{source.detail}</div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}
