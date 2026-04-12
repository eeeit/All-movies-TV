/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, no-console */

'use client';

import {
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Flame,
  Medal,
  PlayCircle,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';

// 客户端收藏 API
import {
  clearAllFavorites,
  getAllFavorites,
  getAllPlayRecords,
  subscribeToDataUpdates,
} from '@/lib/db.client';
import { getDoubanCategories } from '@/lib/douban.client';
import { getOmdbLookup } from '@/lib/omdb.client';
import { getTraktTrending } from '@/lib/trakt.client';
import { getTmdbTrending } from '@/lib/tmdb.client';
import { getTvmazeShowSearch } from '@/lib/tvmaze.client';
import {
  DoubanItem,
  OmdbItem,
  TmdbItem,
  TraktItem,
  TvmazeItem,
} from '@/lib/types';
import { processImageUrl } from '@/lib/utils';

import CapsuleSwitch from '@/components/CapsuleSwitch';
import PageLayout from '@/components/PageLayout';
import { useLanguage } from '@/components/LanguageProvider';
import { useSite } from '@/components/SiteProvider';
import VideoCard from '@/components/VideoCard';

function HomeClient() {
  const [activeTab, setActiveTab] = useState<'home' | 'favorites'>('home');
  const [tmdbMovies, setTmdbMovies] = useState<TmdbItem[]>([]);
  const [tmdbTvShows, setTmdbTvShows] = useState<TmdbItem[]>([]);
  const [traktMovies, setTraktMovies] = useState<TraktItem[]>([]);
  const [traktTvShows, setTraktTvShows] = useState<TraktItem[]>([]);
  const [tvmazeTvShows, setTvmazeTvShows] = useState<
    Record<string, TvmazeItem>
  >({});
  const [omdbMovies, setOmdbMovies] = useState<Record<string, OmdbItem>>({});
  const [omdbTvShows, setOmdbTvShows] = useState<Record<string, OmdbItem>>({});
  const [hotMovies, setHotMovies] = useState<DoubanItem[]>([]);
  const [hotTvShows, setHotTvShows] = useState<DoubanItem[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  const { announcement } = useSite();

  const [showAnnouncement, setShowAnnouncement] = useState(false);

  // 检查公告弹窗状态
  useEffect(() => {
    if (typeof window !== 'undefined' && announcement) {
      const hasSeenAnnouncement = localStorage.getItem('hasSeenAnnouncement');
      if (hasSeenAnnouncement !== announcement) {
        setShowAnnouncement(true);
      } else {
        setShowAnnouncement(Boolean(!hasSeenAnnouncement && announcement));
      }
    }
  }, [announcement]);

  // 收藏夹数据
  type FavoriteItem = {
    id: string;
    source: string;
    title: string;
    poster: string;
    episodes: number;
    source_name: string;
    currentEpisode?: number;
    search_title?: string;
  };

  const [favoriteItems, setFavoriteItems] = useState<FavoriteItem[]>([]);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        setLoading(true);

        // 并行获取 TMDb、Trakt 和豆瓣热门内容
        const [
          moviesData,
          tvShowsData,
          tmdbMoviesData,
          tmdbTvShowsData,
          traktMoviesData,
          traktTvShowsData,
        ] = await Promise.allSettled([
          getDoubanCategories({
            kind: 'movie',
            category: '热门',
            type: '全部',
          }),
          getDoubanCategories({ kind: 'tv', category: 'tv', type: 'tv' }),
          getTmdbTrending({ type: 'movie' }),
          getTmdbTrending({ type: 'tv' }),
          getTraktTrending({ type: 'movie' }),
          getTraktTrending({ type: 'show' }),
        ]);

        if (
          moviesData.status === 'fulfilled' &&
          moviesData.value.code === 200
        ) {
          setHotMovies(moviesData.value.list);
        }

        if (
          tvShowsData.status === 'fulfilled' &&
          tvShowsData.value.code === 200
        ) {
          setHotTvShows(tvShowsData.value.list);
        }

        if (
          tmdbMoviesData.status === 'fulfilled' &&
          tmdbMoviesData.value.code === 200
        ) {
          setTmdbMovies(tmdbMoviesData.value.list);
        }

        if (
          tmdbTvShowsData.status === 'fulfilled' &&
          tmdbTvShowsData.value.code === 200
        ) {
          setTmdbTvShows(tmdbTvShowsData.value.list);
        }

        if (
          traktMoviesData.status === 'fulfilled' &&
          traktMoviesData.value.code === 200
        ) {
          setTraktMovies(traktMoviesData.value.list);
        }

        if (
          traktTvShowsData.status === 'fulfilled' &&
          traktTvShowsData.value.code === 200
        ) {
          setTraktTvShows(traktTvShowsData.value.list);
        }
      } catch (error) {
        console.error('获取豆瓣数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, []);

  // 处理收藏数据更新的函数
  const updateFavoriteItems = async (allFavorites: Record<string, any>) => {
    const allPlayRecords = await getAllPlayRecords();

    // 根据保存时间排序（从近到远）
    const sorted = Object.entries(allFavorites)
      .sort(([, a], [, b]) => b.save_time - a.save_time)
      .map(([key, fav]) => {
        const plusIndex = key.indexOf('+');
        const source = key.slice(0, plusIndex);
        const id = key.slice(plusIndex + 1);

        // 查找对应的播放记录，获取当前集数
        const playRecord = allPlayRecords[key];
        const currentEpisode = playRecord?.index;

        return {
          id,
          source,
          title: fav.title,
          year: fav.year,
          poster: fav.cover,
          episodes: fav.total_episodes,
          source_name: fav.source_name,
          currentEpisode,
          search_title: fav?.search_title,
        } as FavoriteItem;
      });
    setFavoriteItems(sorted);
  };

  // 当切换到收藏夹时加载收藏数据
  useEffect(() => {
    if (activeTab !== 'favorites') return;

    const loadFavorites = async () => {
      const allFavorites = await getAllFavorites();
      await updateFavoriteItems(allFavorites);
    };

    loadFavorites();

    // 监听收藏更新事件
    const unsubscribe = subscribeToDataUpdates(
      'favoritesUpdated',
      (newFavorites: Record<string, any>) => {
        updateFavoriteItems(newFavorites);
      }
    );

    return unsubscribe;
  }, [activeTab]);

  const handleCloseAnnouncement = (announcement: string) => {
    setShowAnnouncement(false);
    localStorage.setItem('hasSeenAnnouncement', announcement); // 记录已查看弹窗
  };

  const displayMovies =
    tmdbMovies.length > 0
      ? tmdbMovies
      : traktMovies.length > 0
      ? traktMovies
      : hotMovies;
  const displayTvShows =
    tmdbTvShows.length > 0
      ? tmdbTvShows
      : traktTvShows.length > 0
      ? traktTvShows
      : hotTvShows;

  type HeroContent = {
    title?: string;
    poster?: string;
    backdrop?: string;
    overview?: string;
    summary?: string;
  };

  const heroSlides: HeroContent[] = [
    ...displayMovies.slice(0, 6),
    ...displayTvShows.slice(0, 4),
  ].map((item) => ({
    title: item.title,
    poster: item.poster,
    backdrop: (item as any).backdrop,
    overview: (item as any).overview,
    summary: (item as any).summary,
  }));

  const heroItem = heroSlides[heroIndex];
  const heroTitle = heroItem?.title || announcement || t('featuredContent');
  const heroPoster = heroItem?.backdrop || heroItem?.poster || '';
  const heroImageUrl = heroPoster ? processImageUrl(heroPoster) : '';
  const heroSummary =
    heroItem?.overview || heroItem?.summary || t('visualRebuildSummary');

  const rankingItems = displayMovies.slice(0, 12).map((item, index) => ({
    ...item,
    rank: index + 1,
    group: t('movie'),
  }));
  const movieGridItems = displayMovies.slice(0, 8);
  const seriesGridItems = displayTvShows.slice(0, 8);
  const varietyGridItems = [
    ...displayTvShows.slice(8),
    ...displayMovies.slice(8),
    ...displayTvShows,
    ...displayMovies,
  ].slice(0, 8);

  const jumpToSearch = (title: string) => {
    const targetTitle = title.trim();
    if (!targetTitle) return;
    window.location.href = `/search?q=${encodeURIComponent(targetTitle)}`;
  };

  const goPrevHero = () => {
    if (heroSlides.length <= 1) return;
    setHeroIndex((prev) => (prev === 0 ? heroSlides.length - 1 : prev - 1));
  };

  const goNextHero = () => {
    if (heroSlides.length <= 1) return;
    setHeroIndex((prev) => (prev + 1) % heroSlides.length);
  };

  useEffect(() => {
    if (heroSlides.length === 0) {
      setHeroIndex(0);
      return;
    }

    if (heroIndex >= heroSlides.length) {
      setHeroIndex(0);
    }
  }, [heroSlides.length, heroIndex]);

  useEffect(() => {
    if (activeTab !== 'home' || heroSlides.length <= 1) return;

    const timer = window.setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroSlides.length);
    }, 6500);

    return () => window.clearInterval(timer);
  }, [activeTab, heroSlides.length]);

  useEffect(() => {
    if (displayTvShows.length === 0) {
      setTvmazeTvShows({});
      return;
    }

    let cancelled = false;

    const fetchTvmazeShows = async () => {
      const visibleShows = displayTvShows.slice(0, 8);
      const results = await Promise.allSettled(
        visibleShows.map((show) => getTvmazeShowSearch(show.title))
      );

      const nextMap: Record<string, TvmazeItem> = {};
      results.forEach((result, index) => {
        const title = visibleShows[index]?.title;
        if (!title || result.status !== 'fulfilled') return;

        const matchedShow = result.value.list[0];
        if (result.value.code === 200 && matchedShow) {
          nextMap[title] = matchedShow;
        }
      });

      if (!cancelled) {
        setTvmazeTvShows(nextMap);
      }
    };

    fetchTvmazeShows();

    return () => {
      cancelled = true;
    };
  }, [displayTvShows]);

  useEffect(() => {
    if (displayMovies.length === 0) {
      setOmdbMovies({});
      return;
    }

    let cancelled = false;

    const fetchOmdbMovies = async () => {
      const visibleMovies = displayMovies.slice(0, 8);
      const results = await Promise.allSettled(
        visibleMovies.map((movie) =>
          getOmdbLookup({ query: movie.title, type: 'movie' })
        )
      );

      const nextMap: Record<string, OmdbItem> = {};
      results.forEach((result, index) => {
        const title = visibleMovies[index]?.title;
        if (!title || result.status !== 'fulfilled') return;

        const matchedMovie = result.value.list[0];
        if (result.value.code === 200 && matchedMovie) {
          nextMap[title] = matchedMovie;
        }
      });

      if (!cancelled) {
        setOmdbMovies(nextMap);
      }
    };

    fetchOmdbMovies();

    return () => {
      cancelled = true;
    };
  }, [displayMovies]);

  useEffect(() => {
    if (displayTvShows.length === 0) {
      setOmdbTvShows({});
      return;
    }

    let cancelled = false;

    const fetchOmdbTvShows = async () => {
      const visibleTvShows = displayTvShows.slice(0, 8);
      const results = await Promise.allSettled(
        visibleTvShows.map((show) =>
          getOmdbLookup({ query: show.title, type: 'series' })
        )
      );

      const nextMap: Record<string, OmdbItem> = {};
      results.forEach((result, index) => {
        const title = visibleTvShows[index]?.title;
        if (!title || result.status !== 'fulfilled') return;

        const matchedShow = result.value.list[0];
        if (result.value.code === 200 && matchedShow) {
          nextMap[title] = matchedShow;
        }
      });

      if (!cancelled) {
        setOmdbTvShows(nextMap);
      }
    };

    fetchOmdbTvShows();

    return () => {
      cancelled = true;
    };
  }, [displayTvShows]);

  return (
    <PageLayout>
      <div className='px-1 sm:px-8 lg:px-10 py-3 sm:py-7 overflow-visible'>
        {/* 顶部 Tab 切换 */}
        <div className='mb-7 sm:mb-8 flex justify-center'>
          <CapsuleSwitch
            options={[
              { label: t('home'), value: 'home' },
              { label: t('favorites'), value: 'favorites' },
            ]}
            active={activeTab}
            onChange={(value) => setActiveTab(value as 'home' | 'favorites')}
          />
        </div>

        <div className='max-w-[1600px] mx-auto'>
          {activeTab === 'favorites' ? (
            // 收藏夹视图
            <section className='mb-8'>
              <div className='mb-4 flex items-center justify-between'>
                <h2 className='text-xl font-bold text-neutral-100'>
                  {t('myFavorites')}
                </h2>
                {favoriteItems.length > 0 && (
                  <button
                    className='text-sm text-neutral-400 hover:text-[#f0b90b]'
                    onClick={async () => {
                      await clearAllFavorites();
                      setFavoriteItems([]);
                    }}
                  >
                    {t('clear')}
                  </button>
                )}
              </div>
              <div className='justify-start grid grid-cols-3 gap-x-2 gap-y-14 sm:gap-y-20 px-0 sm:px-2 sm:grid-cols-[repeat(auto-fill,_minmax(11rem,_1fr))] sm:gap-x-8'>
                {favoriteItems.map((item) => (
                  <div key={item.id + item.source} className='w-full'>
                    <VideoCard
                      query={item.search_title}
                      {...item}
                      from='favorite'
                      type={item.episodes > 1 ? 'tv' : ''}
                    />
                  </div>
                ))}
                {favoriteItems.length === 0 && (
                  <div className='col-span-full text-center text-neutral-400 py-8'>
                    {t('noFavorites')}
                  </div>
                )}
              </div>
            </section>
          ) : (
            // 首页视图
            <div className='px-1 sm:px-4 lg:px-5 pb-10'>
              <div className='grid gap-6 lg:gap-8 xl:gap-10 xl:grid-cols-[minmax(0,1fr)_340px]'>
                <div className='space-y-7 sm:space-y-8'>
                  <section className='relative aspect-[16/10] sm:aspect-[21/9] overflow-hidden rounded-[1.4rem] sm:rounded-[1.8rem] border border-white/10 bg-[#141414] shadow-[0_24px_70px_rgba(0,0,0,0.48)]'>
                    <div className='absolute inset-0'>
                      {heroPoster ? (
                        <img
                          src={heroImageUrl}
                          alt={heroTitle}
                          className='h-full w-full object-cover'
                        />
                      ) : (
                        <div className='h-full w-full bg-[radial-gradient(circle_at_18%_18%,_rgba(212,175,55,0.2),_transparent_42%),linear-gradient(120deg,_#0f0f0f,_#1a1a1a)]' />
                      )}
                      <div className='absolute inset-0 bg-gradient-to-r from-transparent via-[#0f0f0f]/55 to-[#0f0f0f]/95' />
                      <div className='absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent' />
                    </div>

                    <button
                      type='button'
                      aria-label='Previous slide'
                      onClick={goPrevHero}
                      disabled={heroSlides.length <= 1}
                      className='absolute left-2.5 sm:left-4 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/25 bg-black/45 p-1.5 sm:p-2.5 text-white/80 transition-colors hover:bg-[#d4af37] hover:text-black'
                    >
                      <ChevronLeft className='h-4 w-4 sm:h-5 sm:w-5' />
                    </button>
                    <button
                      type='button'
                      aria-label='Next slide'
                      onClick={goNextHero}
                      disabled={heroSlides.length <= 1}
                      className='absolute right-2.5 sm:right-4 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/25 bg-black/45 p-1.5 sm:p-2.5 text-white/80 transition-colors hover:bg-[#d4af37] hover:text-black'
                    >
                      <ChevronRight className='h-4 w-4 sm:h-5 sm:w-5' />
                    </button>

                    <div className='relative z-10 flex h-full items-center justify-end p-5 sm:p-8 lg:p-10'>
                      <div className='max-w-[28rem] text-right'>
                        <h1 className='text-[1.55rem] font-black leading-tight tracking-tight text-white drop-shadow sm:text-[2.35rem] lg:text-[2.65rem]'>
                          {heroTitle}
                        </h1>
                        <p className='mt-3 text-[13px] leading-6 text-neutral-300 sm:text-[15px] sm:leading-7'>
                          {heroSummary}
                        </p>
                        <div className='mt-7 flex justify-end gap-2.5 sm:gap-3'>
                          <button
                            className='inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#d4af37] to-[#b39028] px-5 py-2.5 text-[13px] font-semibold text-black shadow-[0_14px_32px_rgba(212,175,55,0.3)] transition-transform hover:scale-[1.03] sm:px-7 sm:py-3 sm:text-[15px]'
                            onClick={() => jumpToSearch(heroTitle)}
                          >
                            <PlayCircle className='h-4 w-4 fill-black shrink-0' />
                            {t('watchNow')}
                          </button>
                          <button
                            className='inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-white/20 sm:px-7 sm:py-3 sm:text-[15px]'
                            onClick={() => jumpToSearch(heroTitle)}
                          >
                            <Clapperboard className='h-4 w-4 shrink-0' />
                            {t('details')}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className='absolute bottom-3.5 sm:bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-1.5 sm:gap-2'>
                      {heroSlides.map((item, index) => (
                        <button
                          key={`${item.title || 'hero'}-${index}`}
                          type='button'
                          aria-label={`Hero slide ${index + 1}`}
                          onClick={() => setHeroIndex(index)}
                          className={
                            index === heroIndex
                              ? 'h-1.5 w-7 sm:w-8 rounded-full bg-[#d4af37]'
                              : 'h-1.5 w-1.5 sm:w-2 rounded-full bg-white/40'
                          }
                        />
                      ))}
                    </div>
                  </section>

                  <section>
                    <div className='mb-4 sm:mb-5 flex items-center justify-between'>
                      <h2 className='flex items-center gap-2 text-lg sm:text-xl lg:text-[1.35rem] font-bold text-white'>
                        <Flame className='h-5 w-5 text-[#d4af37]' />
                        {t('hotMovies')}
                      </h2>
                      <Link
                        href='/douban?type=movie'
                        className='flex items-center gap-1 text-xs sm:text-sm text-neutral-400 hover:text-white'
                      >
                        {t('more')}
                        <ChevronRight className='h-4 w-4' />
                      </Link>
                    </div>

                    <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4'>
                      {loading
                        ? Array.from({ length: 8 }).map((_, index) => (
                            <div key={index}>
                              <div className='aspect-[2/3] rounded-xl sm:rounded-2xl bg-white/10 animate-pulse' />
                              <div className='mt-2.5 h-3.5 rounded bg-white/10 animate-pulse' />
                              <div className='mt-1.5 h-3 w-2/3 rounded bg-white/10 animate-pulse' />
                            </div>
                          ))
                        : movieGridItems.map((movie) => {
                            const omdbMovie = omdbMovies[movie.title];
                            const actualPoster =
                              omdbMovie?.poster || movie.poster;
                            const actualRate = omdbMovie?.rate || movie.rate;

                            return (
                              <button
                                key={movie.title}
                                className='group text-left space-y-0.5'
                                onClick={() => jumpToSearch(movie.title)}
                              >
                                <div className='relative aspect-[2/3] overflow-hidden rounded-xl sm:rounded-2xl border border-white/10 bg-[#1a1a1a]'>
                                  {actualPoster ? (
                                    <img
                                      src={processImageUrl(actualPoster)}
                                      alt={movie.title}
                                      className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-105'
                                    />
                                  ) : null}
                                  <div className='absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent' />
                                  <span className='absolute right-2 top-2 rounded bg-black/75 px-2 py-1 text-[11px] leading-none font-bold text-[#d4af37]'>
                                    {actualRate || '—'}
                                  </span>
                                  <div className='absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity group-hover:opacity-100'>
                                    <span className='rounded-full bg-[#d4af37] p-2.5 text-black shadow-[0_10px_24px_rgba(0,0,0,0.4)]'>
                                      <PlayCircle className='h-5 w-5 fill-black' />
                                    </span>
                                  </div>
                                </div>
                                <h3 className='mt-2.5 truncate text-[13px] sm:text-sm font-semibold leading-5 text-neutral-100 transition-colors group-hover:text-[#d4af37]'>
                                  {movie.title}
                                </h3>
                                <p className='mt-1 text-[11px] sm:text-xs text-neutral-400'>
                                  {movie.year || '—'}
                                </p>
                              </button>
                            );
                          })}
                    </div>
                  </section>

                  <div className='space-y-7'>
                    <section>
                      <div className='mb-4 sm:mb-5 flex items-center justify-between'>
                        <h2 className='flex items-center gap-2 text-lg sm:text-xl lg:text-[1.35rem] font-bold text-white'>
                          <Sparkles className='h-5 w-5 text-[#d4af37]' />
                          {t('hotSeries')}
                        </h2>
                        <Link
                          href='/douban?type=tv'
                          className='flex items-center gap-1 text-xs sm:text-sm text-neutral-400 hover:text-white'
                        >
                          {t('more')}
                          <ChevronRight className='h-4 w-4' />
                        </Link>
                      </div>
                      <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4'>
                        {loading
                          ? Array.from({ length: 8 }).map((_, index) => (
                              <div key={index}>
                                <div className='aspect-[2/3] rounded-xl sm:rounded-2xl bg-white/10 animate-pulse' />
                                <div className='mt-2.5 h-3.5 rounded bg-white/10 animate-pulse' />
                                <div className='mt-1.5 h-3 w-2/3 rounded bg-white/10 animate-pulse' />
                              </div>
                            ))
                          : seriesGridItems.map((show) => {
                              const tvmazeShow = tvmazeTvShows[show.title];
                              const omdbShow = omdbTvShows[show.title];
                              const actualPoster =
                                tvmazeShow?.poster ||
                                omdbShow?.poster ||
                                show.poster;
                              const actualRate =
                                tvmazeShow?.rate || omdbShow?.rate || show.rate;
                              const seriesYear =
                                tvmazeShow?.year ||
                                omdbShow?.year ||
                                t('updating');

                              return (
                                <button
                                  key={show.title}
                                  className='group text-left space-y-0.5'
                                  onClick={() => jumpToSearch(show.title)}
                                >
                                  <div className='relative aspect-[2/3] overflow-hidden rounded-xl sm:rounded-2xl border border-white/10 bg-[#1a1a1a]'>
                                    {actualPoster ? (
                                      <img
                                        src={processImageUrl(actualPoster)}
                                        alt={show.title}
                                        className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-105'
                                      />
                                    ) : null}
                                    <div className='absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent' />
                                    <span className='absolute right-2 top-2 rounded bg-black/75 px-2 py-1 text-[11px] leading-none font-bold text-[#d4af37]'>
                                      {actualRate || '—'}
                                    </span>
                                    <div className='absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity group-hover:opacity-100'>
                                      <span className='rounded-full bg-[#d4af37] p-2.5 text-black shadow-[0_10px_24px_rgba(0,0,0,0.4)]'>
                                        <PlayCircle className='h-5 w-5 fill-black' />
                                      </span>
                                    </div>
                                  </div>
                                  <h3 className='mt-2.5 truncate text-[13px] sm:text-sm font-semibold leading-5 text-neutral-100 transition-colors group-hover:text-[#d4af37]'>
                                    {show.title}
                                  </h3>
                                  <p className='mt-1 text-[11px] sm:text-xs text-neutral-400'>
                                    {seriesYear}
                                  </p>
                                </button>
                              );
                            })}
                      </div>
                    </section>

                    <section>
                      <div className='mb-4 sm:mb-5 flex items-center justify-between'>
                        <h2 className='flex items-center gap-2 text-lg sm:text-xl lg:text-[1.35rem] font-bold text-white'>
                          <Sparkles className='h-5 w-5 text-[#d4af37]' />
                          {t('variety')}
                        </h2>
                      </div>
                      <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4'>
                        {loading
                          ? Array.from({ length: 8 }).map((_, index) => (
                              <div key={index}>
                                <div className='aspect-[2/3] rounded-xl sm:rounded-2xl bg-white/10 animate-pulse' />
                                <div className='mt-2.5 h-3.5 rounded bg-white/10 animate-pulse' />
                                <div className='mt-1.5 h-3 w-2/3 rounded bg-white/10 animate-pulse' />
                              </div>
                            ))
                          : varietyGridItems.map((item) => {
                              const tvmazeShow = tvmazeTvShows[item.title];
                              const omdbItem =
                                omdbTvShows[item.title] ||
                                omdbMovies[item.title];
                              const actualPoster =
                                tvmazeShow?.poster ||
                                omdbItem?.poster ||
                                item.poster;
                              const actualRate =
                                tvmazeShow?.rate || omdbItem?.rate || item.rate;
                              const varietyYear =
                                tvmazeShow?.year ||
                                omdbItem?.year ||
                                t('updating');

                              return (
                                <button
                                  key={item.title}
                                  className='group text-left space-y-0.5'
                                  onClick={() => jumpToSearch(item.title)}
                                >
                                  <div className='relative aspect-[2/3] overflow-hidden rounded-xl sm:rounded-2xl border border-white/10 bg-[#1a1a1a]'>
                                    {actualPoster ? (
                                      <img
                                        src={processImageUrl(actualPoster)}
                                        alt={item.title}
                                        className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-105'
                                      />
                                    ) : null}
                                    <div className='absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent' />
                                    <span className='absolute right-2 top-2 rounded bg-black/75 px-2 py-1 text-[11px] leading-none font-bold text-[#d4af37]'>
                                      {actualRate || '—'}
                                    </span>
                                    <div className='absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity group-hover:opacity-100'>
                                      <span className='rounded-full bg-[#d4af37] p-2.5 text-black shadow-[0_10px_24px_rgba(0,0,0,0.4)]'>
                                        <PlayCircle className='h-5 w-5 fill-black' />
                                      </span>
                                    </div>
                                  </div>
                                  <h3 className='mt-2.5 truncate text-[13px] sm:text-sm font-semibold leading-5 text-neutral-100 transition-colors group-hover:text-[#d4af37]'>
                                    {item.title}
                                  </h3>
                                  <p className='mt-1 text-[11px] sm:text-xs text-neutral-400'>
                                    {varietyYear}
                                  </p>
                                </button>
                              );
                            })}
                      </div>
                    </section>
                  </div>
                </div>

                <aside className='rounded-[1.4rem] sm:rounded-[1.6rem] border border-white/10 bg-[#1a1a1a]/95 p-4 sm:p-5 shadow-[0_24px_70px_rgba(0,0,0,0.35)] xl:sticky xl:top-28 xl:max-h-[calc(100vh-130px)] xl:overflow-auto'>
                  <div className='mb-4 sm:mb-5 flex items-center justify-between'>
                    <h2 className='flex items-center gap-2 text-lg sm:text-xl lg:text-[1.35rem] font-bold text-white'>
                      <TrendingUp className='h-5 w-5 text-[#d4af37]' />
                      {t('ranking')}
                    </h2>
                    <Link
                      href='/douban?type=movie'
                      className='flex items-center gap-1 text-xs sm:text-sm text-neutral-400 hover:text-white'
                    >
                      {t('more')}
                      <ChevronRight className='h-4 w-4' />
                    </Link>
                  </div>

                  <div className='space-y-2.5 sm:space-y-3'>
                    {loading
                      ? Array.from({ length: 12 }).map((_, index) => (
                          <div
                            key={index}
                            className='flex items-center gap-3 rounded-xl sm:rounded-2xl border border-white/6 bg-white/5 p-2.5 sm:p-3'
                          >
                            <div className='h-6 w-6 rounded-full bg-white/10 animate-pulse' />
                            <div className='h-9 sm:h-10 flex-1 rounded-lg bg-white/10 animate-pulse' />
                          </div>
                        ))
                      : rankingItems.map((item) => {
                          const actualRate =
                            omdbMovies[item.title]?.rate || item.rate;
                          const top3ColorClass =
                            item.rank === 1
                              ? 'text-[#f0c94d]'
                              : item.rank === 2
                              ? 'text-[#c7ced6]'
                              : item.rank === 3
                              ? 'text-[#d89157]'
                              : 'text-neutral-500';

                          return (
                            <button
                              key={`${item.title}-${item.rank}`}
                              className='flex w-full items-center gap-3 rounded-xl sm:rounded-2xl border border-white/6 bg-white/[0.03] p-2.5 sm:p-3 text-left transition-colors hover:border-[#d4af37]/35 hover:bg-white/[0.08]'
                              onClick={() => jumpToSearch(item.title)}
                            >
                              <div className='flex h-8 w-8 items-center justify-center shrink-0'>
                                {item.rank <= 3 ? (
                                  <Medal
                                    className={`h-5 w-5 ${top3ColorClass}`}
                                  />
                                ) : (
                                  <span className='text-xs font-semibold text-neutral-500'>
                                    #{item.rank}
                                  </span>
                                )}
                              </div>
                              <div className='min-w-0 flex-1'>
                                <p className='truncate text-[13px] sm:text-sm font-semibold text-neutral-100'>
                                  {item.title}
                                </p>
                                <p className='mt-0.5 truncate text-[11px] sm:text-xs text-neutral-400'>
                                  {item.group}
                                </p>
                              </div>
                              <p className='text-[13px] sm:text-sm font-bold text-[#d4af37]'>
                                {actualRate || '—'}
                              </p>
                            </button>
                          );
                        })}
                  </div>
                </aside>
              </div>
            </div>
          )}
        </div>
      </div>
      {announcement && showAnnouncement && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm dark:bg-black/70 p-4 transition-opacity duration-300 ${
            showAnnouncement ? '' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className='w-full max-w-md rounded-2xl border border-white/8 bg-[#161616] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.5)] transform transition-all duration-300 hover:shadow-2xl'>
            <div className='flex justify-between items-start mb-4'>
              <h3 className='text-2xl font-bold tracking-tight text-white border-b border-[#f0b90b] pb-1'>
                {t('notice')}
              </h3>
              <button
                onClick={() => handleCloseAnnouncement(announcement)}
                className='text-neutral-400 hover:text-[#f0b90b] transition-colors'
                aria-label={t('cancel')}
              ></button>
            </div>
            <div className='mb-6'>
              <div className='relative overflow-hidden rounded-lg mb-4 bg-white/5'>
                <div className='absolute inset-y-0 left-0 w-1.5 bg-[#f0b90b]'></div>
                <p className='ml-4 text-neutral-300 leading-relaxed'>
                  {announcement}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleCloseAnnouncement(announcement)}
              className='w-full rounded-lg bg-gradient-to-r from-[#f0b90b] to-[#d9a90a] px-4 py-3 text-black font-medium shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5'
            >
              {t('gotIt')}
            </button>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

export default function Home() {
  return (
    <Suspense>
      <HomeClient />
    </Suspense>
  );
}
