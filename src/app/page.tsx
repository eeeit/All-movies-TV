/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, no-console */

'use client';

import {
  ChevronRight,
  Clapperboard,
  Flame,
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

import CapsuleSwitch from '@/components/CapsuleSwitch';
import ContinueWatching from '@/components/ContinueWatching';
import PageLayout from '@/components/PageLayout';
import ScrollableRow from '@/components/ScrollableRow';
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

  const topMovie = displayMovies[0];
  const topTvShow = displayTvShows[0];
  type HeroContent = {
    title?: string;
    poster?: string;
    backdrop?: string;
    overview?: string;
    summary?: string;
  };

  const heroItem = (topMovie || topTvShow) as HeroContent | undefined;
  const heroTitle = heroItem?.title || announcement || t('featuredContent');
  const heroPoster =
    heroItem?.backdrop || heroItem?.poster || topMovie?.poster || '';
  const heroSummary =
    heroItem?.overview || heroItem?.summary || t('visualRebuildSummary');

  const rankingItems = displayMovies.slice(0, 9).map((item, index) => ({
    ...item,
    rank: index + 1,
    group: t('movie'),
  }));

  const spotlightItems = displayTvShows.slice(0, 4).map((item) => ({
    ...item,
    group: t('tv'),
  }));

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
      <div className='px-2 sm:px-10 py-4 sm:py-8 overflow-visible'>
        {/* 顶部 Tab 切换 */}
        <div className='mb-8 flex justify-center'>
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
            <div className='px-2 sm:px-6 pb-8'>
              {/* 强主视觉 + 右侧榜单 */}
              <div className='grid gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(300px,0.85fr)] items-stretch mb-10'>
                <section className='relative min-h-[420px] overflow-hidden rounded-[28px] border border-white/8 bg-[#151515] shadow-[0_24px_70px_rgba(0,0,0,0.45)]'>
                  <div className='absolute inset-0'>
                    {heroPoster ? (
                      <img
                        src={heroPoster}
                        alt={heroTitle}
                        className='h-full w-full object-cover'
                      />
                    ) : (
                      <div className='h-full w-full bg-[radial-gradient(circle_at_top,_rgba(23,47,59,0.75),_transparent_40%),linear-gradient(135deg,_#0f1116,_#181818)]' />
                    )}
                    <div className='absolute inset-0 bg-gradient-to-r from-black via-black/55 to-transparent' />
                    <div className='absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent' />
                  </div>

                  <div className='relative z-10 flex h-full min-h-[420px] items-end p-6 sm:p-10'>
                    <div className='max-w-2xl'>
                      <div className='mb-4 flex flex-wrap items-center gap-3 text-xs font-medium uppercase tracking-[0.24em] text-neutral-300'>
                        <span className='rounded-full border border-[#f0b90b]/30 bg-[#f0b90b]/10 px-3 py-1 text-[#f0b90b]'>
                          MoonTV
                        </span>
                        <span className='flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1'>
                          <Sparkles className='h-3.5 w-3.5 text-[#f0b90b]' />
                          {t('rebuildPreview')}
                        </span>
                      </div>
                      <h1 className='max-w-2xl text-4xl font-black tracking-tight text-white drop-shadow sm:text-5xl lg:text-6xl'>
                        {heroTitle}
                      </h1>
                      <p className='mt-5 max-w-xl text-base leading-7 text-neutral-300 sm:text-lg'>
                        {heroSummary}
                      </p>
                      <div className='mt-8 flex flex-wrap items-center gap-3'>
                        <button
                          className='inline-flex items-center gap-2 rounded-full bg-[#f0b90b] px-6 py-3 text-sm font-semibold text-black shadow-[0_16px_40px_rgba(240,185,11,0.28)] transition-transform hover:-translate-y-0.5'
                          onClick={() => {
                            const targetTitle = heroTitle.trim();
                            if (targetTitle) {
                              window.location.href = `/search?q=${encodeURIComponent(
                                targetTitle
                              )}`;
                            }
                          }}
                        >
                          <PlayCircle className='h-4 w-4 fill-black' />
                          {t('watchNow')}
                        </button>
                        <button className='inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:border-[#f0b90b]/40 hover:text-[#f0b90b]'>
                          <Clapperboard className='h-4 w-4' />
                          {t('details')}
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                <aside className='rounded-[28px] border border-white/8 bg-[#181818]/95 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.35)]'>
                  <div className='mb-4 flex items-center justify-between'>
                    <h2 className='flex items-center gap-2 text-xl font-bold text-white'>
                      <TrendingUp className='h-5 w-5 text-[#f0b90b]' />
                      {t('ranking')}
                    </h2>
                    <Link
                      href='/douban?type=movie'
                      className='flex items-center gap-1 text-sm text-neutral-400 hover:text-[#f0b90b]'
                    >
                      {t('more')}
                      <ChevronRight className='h-4 w-4' />
                    </Link>
                  </div>

                  <div className='space-y-4'>
                    {loading
                      ? Array.from({ length: 9 }).map((_, index) => (
                          <div
                            key={index}
                            className='flex items-center gap-4 rounded-2xl border border-white/5 bg-white/3 p-3'
                          >
                            <div className='h-10 w-8 rounded-lg bg-white/8 animate-pulse' />
                            <div className='h-10 flex-1 rounded-lg bg-white/8 animate-pulse' />
                          </div>
                        ))
                      : rankingItems.map((item) => {
                          const omdbMovie = omdbMovies[item.title];
                          const actualPoster = omdbMovie?.poster || item.poster;
                          const actualRate = omdbMovie?.rate || item.rate;
                          return (
                            <button
                              key={`${item.title}-${item.rank}`}
                              className='flex w-full items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.03] p-3 text-left transition-colors hover:border-[#f0b90b]/25 hover:bg-white/[0.06]'
                              onClick={() => {
                                window.location.href = `/search?q=${encodeURIComponent(
                                  item.title
                                )}`;
                              }}
                            >
                              <div className='flex h-10 w-8 items-center justify-center text-lg font-black text-[#f0b90b]'>
                                {item.rank === 1 ? '👑' : item.rank}
                              </div>
                              <div className='h-12 w-8 overflow-hidden rounded-md bg-neutral-800'>
                                {actualPoster ? (
                                  <img
                                    src={actualPoster}
                                    alt={item.title}
                                    className='h-full w-full object-cover'
                                  />
                                ) : null}
                              </div>
                              <div className='min-w-0 flex-1'>
                                <div className='truncate text-sm font-semibold text-neutral-100'>
                                  {item.title}
                                </div>
                                <div className='mt-1 truncate text-xs text-neutral-400'>
                                  {item.group}
                                </div>
                              </div>
                              <div className='text-sm font-bold text-[#f0b90b]'>
                                {actualRate || '—'}
                              </div>
                            </button>
                          );
                        })}
                  </div>
                </aside>
              </div>

              <div className='grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]'>
                <section className='space-y-8'>
                  <ContinueWatching />

                  <section>
                    <div className='mb-4 flex items-center justify-between'>
                      <h2 className='flex items-center gap-2 text-2xl font-bold text-white'>
                        <Flame className='h-5 w-5 text-[#f0b90b]' />
                        {t('hotMovies')}
                      </h2>
                      <Link
                        href='/douban?type=movie'
                        className='flex items-center text-sm text-neutral-400 hover:text-[#f0b90b]'
                      >
                        {t('more')}
                        <ChevronRight className='w-4 h-4 ml-1' />
                      </Link>
                    </div>
                    <ScrollableRow>
                      {loading
                        ? Array.from({ length: 8 }).map((_, index) => (
                            <div
                              key={index}
                              className='min-w-[160px] w-40 sm:min-w-[180px] sm:w-44'
                            >
                              <div className='relative aspect-[2/3] w-full overflow-hidden rounded-2xl bg-white/8 animate-pulse' />
                              <div className='mt-3 h-4 rounded bg-white/8 animate-pulse' />
                              <div className='mt-2 h-3 rounded bg-white/8 animate-pulse w-2/3' />
                            </div>
                          ))
                        : displayMovies.map((movie, index) => {
                            const omdbMovie = omdbMovies[movie.title];
                            const actualPoster =
                              omdbMovie?.poster || movie.poster;
                            const actualRate = omdbMovie?.rate || movie.rate;
                            const actualYear = omdbMovie?.year || movie.year;
                            const source =
                              tmdbMovies.length > 0
                                ? 'tmdb'
                                : traktMovies.length > 0
                                ? 'trakt'
                                : 'douban';

                            return (
                              <div
                                key={index}
                                className='min-w-[160px] w-40 sm:min-w-[180px] sm:w-44'
                              >
                                <VideoCard
                                  from={source}
                                  title={movie.title}
                                  poster={actualPoster}
                                  douban_id={
                                    source === 'douban' ? movie.id : undefined
                                  }
                                  rate={actualRate}
                                  year={actualYear}
                                  type='movie'
                                />
                              </div>
                            );
                          })}
                    </ScrollableRow>
                  </section>

                  <section>
                    <div className='mb-4 flex items-center justify-between'>
                      <h2 className='flex items-center gap-2 text-2xl font-bold text-white'>
                        <Sparkles className='h-5 w-5 text-[#f0b90b]' />
                        {t('hotSeries')}
                      </h2>
                      <Link
                        href='/douban?type=tv'
                        className='flex items-center text-sm text-neutral-400 hover:text-[#f0b90b]'
                      >
                        {t('more')}
                        <ChevronRight className='w-4 h-4 ml-1' />
                      </Link>
                    </div>
                    <ScrollableRow>
                      {loading
                        ? Array.from({ length: 8 }).map((_, index) => (
                            <div
                              key={index}
                              className='min-w-[160px] w-40 sm:min-w-[180px] sm:w-44'
                            >
                              <div className='relative aspect-[2/3] w-full overflow-hidden rounded-2xl bg-white/8 animate-pulse' />
                              <div className='mt-3 h-4 rounded bg-white/8 animate-pulse' />
                              <div className='mt-2 h-3 rounded bg-white/8 animate-pulse w-2/3' />
                            </div>
                          ))
                        : displayTvShows.map((show, index) => {
                            const tvmazeShow = tvmazeTvShows[show.title];
                            const omdbShow = omdbTvShows[show.title];
                            const actualPoster =
                              tvmazeShow?.poster ||
                              omdbShow?.poster ||
                              show.poster;
                            const actualRate =
                              tvmazeShow?.rate || omdbShow?.rate || show.rate;
                            const actualYear =
                              tvmazeShow?.year || omdbShow?.year || show.year;
                            const source =
                              tmdbTvShows.length > 0
                                ? 'tmdb'
                                : traktTvShows.length > 0
                                ? 'trakt'
                                : 'douban';

                            return (
                              <div
                                key={index}
                                className='min-w-[160px] w-40 sm:min-w-[180px] sm:w-44'
                              >
                                <VideoCard
                                  from={source}
                                  title={show.title}
                                  poster={actualPoster}
                                  douban_id={
                                    source === 'douban' ? show.id : undefined
                                  }
                                  rate={actualRate}
                                  year={actualYear}
                                />
                              </div>
                            );
                          })}
                    </ScrollableRow>
                  </section>
                </section>

                <aside className='space-y-6'>
                  <section className='rounded-[28px] border border-white/8 bg-[#181818]/95 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.35)]'>
                    <div className='mb-4 flex items-center justify-between'>
                      <h3 className='text-xl font-bold text-white'>
                        {t('editorPicks')}
                      </h3>
                      <span className='text-sm text-neutral-400'>
                        {t('recommend')}
                      </span>
                    </div>
                    <div className='space-y-3'>
                      {spotlightItems.map((item) => {
                        const omdbShow = omdbTvShows[item.title];
                        const actualPoster =
                          item.poster || omdbShow?.poster || '';
                        return (
                          <button
                            key={item.title}
                            className='flex w-full items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-3 text-left transition-colors hover:border-[#f0b90b]/25 hover:bg-white/[0.06]'
                            onClick={() => {
                              window.location.href = `/search?q=${encodeURIComponent(
                                item.title
                              )}`;
                            }}
                          >
                            <div className='h-16 w-24 overflow-hidden rounded-xl bg-neutral-800'>
                              {actualPoster ? (
                                <img
                                  src={actualPoster}
                                  alt={item.title}
                                  className='h-full w-full object-cover'
                                />
                              ) : null}
                            </div>
                            <div className='min-w-0 flex-1'>
                              <div className='truncate font-semibold text-neutral-100'>
                                {item.title}
                              </div>
                              <div className='mt-1 line-clamp-2 text-xs text-neutral-400'>
                                {item.rate || item.year || t('featured')}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section className='rounded-[28px] border border-white/8 bg-[#181818]/95 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.35)]'>
                    <div className='mb-4 flex items-center justify-between'>
                      <h3 className='text-xl font-bold text-white'>
                        {t('weeklyUpdate')}
                      </h3>
                      <span className='text-sm text-neutral-400'>
                        {t('updating')}
                      </span>
                    </div>
                    <div className='grid grid-cols-2 gap-3'>
                      {displayMovies.slice(0, 4).map((item) => (
                        <button
                          key={item.title}
                          className='group relative aspect-[16/9] overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03] text-left'
                          onClick={() => {
                            window.location.href = `/search?q=${encodeURIComponent(
                              item.title
                            )}`;
                          }}
                        >
                          <div className='absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent' />
                          <div className='absolute inset-0 flex items-end p-3'>
                            <div>
                              <div className='text-sm font-semibold text-white'>
                                {item.title}
                              </div>
                              <div className='text-xs text-[#f0b90b]'>
                                {item.rate || item.year}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>
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
