import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import type { DoubanItem, TmdbItem, TraktItem } from '@shared/api-contract';

import AppShell from '@/components/AppShell';
import ContinueWatching from '@/components/ContinueWatching';
import ScrollableRow from '@/components/ScrollableRow';
import { useLanguage } from '@/components/LanguageProvider';
import { useSite } from '@/components/SiteProvider';
import VideoCard from '@/components/VideoCard';
import { apiClient } from '@/lib/api-client';
import { processImageUrl } from '@/lib/utils';

function SkeletonRow() {
  return (
    <ScrollableRow>
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className='min-w-[150px] sm:min-w-[190px]'>
          <div className='aspect-[2/3] animate-pulse rounded-[1.25rem] bg-white/8' />
          <div className='mt-3 h-4 animate-pulse rounded bg-white/8' />
          <div className='mt-2 h-3 w-2/3 animate-pulse rounded bg-white/8' />
        </div>
      ))}
    </ScrollableRow>
  );
}

function RailSection({
  title,
  loading,
  children,
}: {
  title: string;
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className='mt-10'>
      <div className='mb-4 flex items-center justify-between'>
        <h2 className='text-xl font-bold text-white sm:text-2xl'>{title}</h2>
      </div>

      {loading ? <SkeletonRow /> : children}
    </section>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { siteName, announcement } = useSite();
  const [searchValue, setSearchValue] = useState('');
  const [movieItems, setMovieItems] = useState<TmdbItem[]>([]);
  const [showItems, setShowItems] = useState<TraktItem[]>([]);
  const [editorItems, setEditorItems] = useState<DoubanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError('');

    Promise.all([
      apiClient.getTmdbTrending({ type: 'movie' }),
      apiClient.getTraktTrending({ type: 'show' }),
      apiClient.getDouban({ type: 'movie', tag: '豆瓣高分' }),
    ])
      .then(([movieResult, showResult, editorResult]) => {
        if (cancelled) {
          return;
        }

        setMovieItems(movieResult.list);
        setShowItems(showResult.list);
        setEditorItems(editorResult.list);
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
  }, [t]);

  const featuredMovie = movieItems[0];
  const heroImage = useMemo(() => {
    const image = featuredMovie?.backdrop || featuredMovie?.poster || '';
    return image ? processImageUrl(image) : '';
  }, [featuredMovie]);

  const summaryCards = [
    {
      label: t('hotMovies'),
      value: movieItems[0]?.title || '',
    },
    {
      label: t('hotSeries'),
      value: showItems[0]?.title || '',
    },
    {
      label: t('editorPicks'),
      value: editorItems[0]?.title || '',
    },
  ];

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = searchValue.trim();
    if (!trimmed) {
      return;
    }

    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <AppShell>
      <section className='relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#111111] shadow-[0_32px_64px_rgba(0,0,0,0.32)]'>
        {heroImage ? (
          <img
            src={heroImage}
            alt={featuredMovie?.title || siteName}
            className='absolute inset-0 h-full w-full object-cover opacity-30'
          />
        ) : null}

        <div className='absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(240,185,11,0.24),_transparent_34%),linear-gradient(135deg,rgba(8,8,8,0.96),rgba(8,8,8,0.75))]' />

        <div className='relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:p-10'>
          <div className='max-w-2xl space-y-5'>
            <span className='inline-flex rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-3 py-1 text-xs font-semibold tracking-[0.22em] text-[#f0b90b]'>
              {t('featured')}
            </span>

            <div className='space-y-3'>
              <h1 className='text-4xl font-black tracking-[0.12em] text-white sm:text-5xl'>
                {siteName}
              </h1>
              <p className='max-w-xl text-sm text-neutral-200 sm:text-base'>
                {announcement || t('visualRebuildSummary')}
              </p>
            </div>

            <form
              onSubmit={handleSearch}
              className='flex flex-col gap-3 sm:flex-row'
            >
              <input
                type='search'
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder={t('searchPlaceholder')}
                className='h-12 flex-1 rounded-2xl border border-white/10 bg-black/35 px-4 text-sm text-white outline-none transition-colors placeholder:text-neutral-500 focus:border-[#d4af37]/45 focus:bg-black/45'
              />
              <button
                type='submit'
                className='h-12 rounded-2xl bg-[#f0b90b] px-6 text-sm font-semibold text-black transition-transform hover:scale-[1.01]'
              >
                {t('search')}
              </button>
            </form>

            <div className='flex flex-wrap gap-3'>
              <Link
                to={
                  featuredMovie
                    ? `/search?q=${encodeURIComponent(featuredMovie.title)}`
                    : '/search'
                }
                className='rounded-2xl border border-[#d4af37]/30 bg-[#d4af37]/10 px-5 py-3 text-sm font-semibold text-[#f0b90b] transition-colors hover:bg-[#d4af37]/16'
              >
                {t('watchNow')}
              </Link>
              <Link
                to='/douban'
                className='rounded-2xl border border-white/10 bg-white/6 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10'
              >
                {t('featuredContent')}
              </Link>
            </div>
          </div>

          <div className='grid gap-3 sm:grid-cols-3 lg:grid-cols-1'>
            {summaryCards.map((card) => (
              <div
                key={card.label}
                className='rounded-[1.5rem] border border-white/10 bg-black/30 p-4 backdrop-blur-sm'
              >
                <div className='text-xs font-semibold tracking-[0.22em] text-[#f0b90b]'>
                  {card.label}
                </div>
                <div className='mt-3 line-clamp-2 text-base font-semibold text-white'>
                  {card.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {error ? (
        <div className='mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200'>
          {error}
        </div>
      ) : null}

      <ContinueWatching className='mt-10' />

      <RailSection title={t('hotMovies')} loading={loading}>
        <ScrollableRow>
          {movieItems.map((item) => (
            <div key={item.id} className='min-w-[150px] sm:min-w-[190px]'>
              <VideoCard
                title={item.title}
                poster={item.poster}
                year={item.year}
                rate={item.rate}
                href={`/search?q=${encodeURIComponent(item.title)}`}
                type={item.mediaType === 'tv' ? 'tv' : 'movie'}
              />
            </div>
          ))}
        </ScrollableRow>
      </RailSection>

      <RailSection title={t('hotSeries')} loading={loading}>
        <ScrollableRow>
          {showItems.map((item) => (
            <div key={item.id} className='min-w-[150px] sm:min-w-[190px]'>
              <VideoCard
                title={item.title}
                poster={item.poster}
                year={item.year}
                rate={item.rate}
                href={`/search?q=${encodeURIComponent(item.title)}`}
                type={item.type === 'show' ? 'tv' : 'movie'}
              />
            </div>
          ))}
        </ScrollableRow>
      </RailSection>

      <RailSection title={t('editorPicks')} loading={loading}>
        <ScrollableRow>
          {editorItems.map((item) => (
            <div key={item.id} className='min-w-[150px] sm:min-w-[190px]'>
              <VideoCard
                title={item.title}
                poster={item.poster}
                year={item.year}
                rate={item.rate}
                href={`/search?q=${encodeURIComponent(item.title)}`}
                type='movie'
              />
            </div>
          ))}
        </ScrollableRow>
      </RailSection>
    </AppShell>
  );
}
