import { useEffect, useMemo, useState } from 'react';

import type { DoubanItem } from '@shared/api-contract';

import AppShell from '@/components/AppShell';
import CapsuleSwitch from '@/components/CapsuleSwitch';
import { useLanguage } from '@/components/LanguageProvider';
import VideoCard from '@/components/VideoCard';
import { apiClient } from '@/lib/api-client';

export default function DoubanPage() {
  const { t } = useLanguage();
  const [contentType, setContentType] = useState<'movie' | 'tv'>('movie');
  const [tag, setTag] = useState('热门');
  const [items, setItems] = useState<DoubanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const typeOptions = useMemo(
    () => [
      { label: t('movie'), value: 'movie' },
      { label: t('tv'), value: 'tv' },
    ],
    [t]
  );

  const movieTags = useMemo(
    () => [
      { label: t('hotMovies'), value: '热门' },
      { label: t('latestMovies'), value: '最新' },
      { label: t('doubanHighScore'), value: '豆瓣高分' },
      { label: t('nicheMovies'), value: '冷门佳片' },
    ],
    [t]
  );

  const tvTags = useMemo(
    () => [
      { label: t('all'), value: 'tv' },
      { label: t('domestic'), value: 'tv_domestic' },
      { label: t('western'), value: 'tv_american' },
      { label: t('japan'), value: 'tv_japanese' },
      { label: t('korea'), value: 'tv_korean' },
    ],
    [t]
  );

  const activeTags = contentType === 'movie' ? movieTags : tvTags;

  useEffect(() => {
    setTag(contentType === 'movie' ? movieTags[0].value : tvTags[0].value);
  }, [contentType, movieTags, tvTags]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    apiClient
      .getDouban({ type: contentType, tag })
      .then((response) => {
        if (!cancelled) {
          setItems(response.list);
        }
      })
      .catch((nextError) => {
        if (!cancelled) {
          setError(
            nextError instanceof Error ? nextError.message : t('networkError')
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
  }, [contentType, tag, t]);

  return (
    <AppShell>
      <section className='space-y-6'>
        <div className='rounded-[2rem] border border-white/10 bg-[#101010]/75 p-6 shadow-[0_28px_56px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-8'>
          <div className='mb-4 text-sm font-medium text-neutral-400'>
            {t('featuredContent')}
          </div>

          <div className='flex flex-col gap-4'>
            <CapsuleSwitch
              options={typeOptions}
              active={contentType}
              onChange={(value) => setContentType(value as 'movie' | 'tv')}
            />

            <div className='overflow-x-auto pb-1'>
              <CapsuleSwitch
                options={activeTags}
                active={tag}
                onChange={setTag}
                className='w-max'
              />
            </div>
          </div>
        </div>

        {error ? (
          <div className='rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200'>
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6'>
            {Array.from({ length: 12 }).map((_, index) => (
              <div key={index}>
                <div className='aspect-[2/3] animate-pulse rounded-[1.25rem] bg-white/8' />
                <div className='mt-3 h-4 animate-pulse rounded bg-white/8' />
                <div className='mt-2 h-3 w-2/3 animate-pulse rounded bg-white/8' />
              </div>
            ))}
          </div>
        ) : (
          <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6'>
            {items.map((item) => (
              <VideoCard
                key={item.id}
                title={item.title}
                poster={item.poster}
                year={item.year}
                rate={item.rate}
                href={`/search?q=${encodeURIComponent(item.title)}`}
                type={contentType === 'tv' ? 'tv' : 'movie'}
              />
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
