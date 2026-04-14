/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, no-console */

'use client';

import {
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Crown,
  Flame,
  PlayCircle,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import Script from 'next/script';
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
import { getTmdbTrending } from '@/lib/tmdb.client';
import { getTraktTrending } from '@/lib/trakt.client';
import { getTvmazeShowSearch } from '@/lib/tvmaze.client';
import {
  DoubanItem,
  OmdbItem,
  SearchResult,
  TmdbItem,
  TraktItem,
  TvmazeItem,
} from '@/lib/types';
import { processImageUrl } from '@/lib/utils';

import CapsuleSwitch from '@/components/CapsuleSwitch';
import { useLanguage } from '@/components/LanguageProvider';
import PageLayout from '@/components/PageLayout';
import { useSite } from '@/components/SiteProvider';
import VideoCard from '@/components/VideoCard';

type LAAnalyticsWindow = Window & {
  LA?: {
    init: (config: { id: string; ck: string }) => void;
  };
};

const LA_ANALYTICS_CONFIG = {
  id: '3Pbo6TXPCgl3AdWS',
  ck: '3Pbo6TXPCgl3AdWS',
};

let hasLaAnalyticsInitialized = false;

const HERO_POSTER_SOURCE_PRIORITY = [
  'dyttzy',
  'ruyi',
  'bfzy',
  'ffzy',
  'zy360',
  'wujin',
  'wolong',
  'lzi',
  'mdzy',
  'jisu',
];

const HERO_BACKDROP_DETAIL_LOOKUP_LIMIT = 2;
const HERO_FALLBACK_MOVIE_POOL_LIMIT = 15;
const HERO_FALLBACK_TV_POOL_LIMIT = 9;
const HERO_FALLBACK_LOOKUP_LIMIT =
  HERO_FALLBACK_MOVIE_POOL_LIMIT + HERO_FALLBACK_TV_POOL_LIMIT;
const HERO_SLIDE_LIMIT = 6;
const HERO_POSTER_SLICE_POSITIONS = ['16%', '50%', '84%'];
const HERO_POSTER_SLICE_Y_POSITION = '28%';
const CURATED_HERO_TITLES = [
  '拼桌',
  '密探',
  '瑞典救援暗线',
  '危险关系',
  '家事法庭',
  '白日提灯',
];

type HeroVisualAsset = {
  poster?: string;
  backdrop?: string;
};

type HeroSourceItem = DoubanItem | TmdbItem | TraktItem;

function getHighQualityHeroImageUrl(originalUrl: string): string {
  if (!originalUrl) return originalUrl;

  if (originalUrl.includes('image.tmdb.org/t/p/')) {
    return originalUrl.replace(/\/t\/p\/(?:w\d+|original)\//, '/t/p/original/');
  }

  if (originalUrl.includes('doubanio.com/view/photo/')) {
    return originalUrl
      .replace('/s_ratio_poster/', '/l_ratio_poster/')
      .replace('/m_ratio_poster/', '/l_ratio_poster/');
  }

  if (originalUrl.includes('static.tvmaze.com/uploads/images/')) {
    return originalUrl
      .replace('/medium/', '/original_untouched/')
      .replace('/original/', '/original_untouched/');
  }

  return originalUrl;
}

function getOptimizedHeroSliceImageUrl(originalUrl: string): string {
  if (!originalUrl) return originalUrl;

  if (originalUrl.includes('image.tmdb.org/t/p/')) {
    return originalUrl.replace(/\/t\/p\/(?:w\d+|original)\//, '/t/p/w780/');
  }

  if (originalUrl.includes('doubanio.com/view/photo/')) {
    return originalUrl
      .replace('/l_ratio_poster/', '/m_ratio_poster/')
      .replace('/s_ratio_poster/', '/m_ratio_poster/');
  }

  if (originalUrl.includes('static.tvmaze.com/uploads/images/')) {
    return originalUrl
      .replace('/original_untouched/', '/medium/')
      .replace('/original/', '/medium/');
  }

  return originalUrl;
}

function normalizeHeroLookupTitle(title: string): string {
  return title
    .replace(/[\s·•:：\-—_]/g, '')
    .trim()
    .toLowerCase();
}

function isPreviewSearchResult(result: SearchResult): boolean {
  const rawLabel = `${result.title} ${result.type_name || ''} ${
    result.class || ''
  }`;
  return /(预告|片花|花絮|解说|抢先版)/.test(rawLabel);
}

function getHeroSearchResultScore(
  result: SearchResult,
  title: string,
  year?: string
): number {
  if ((!result.poster && !result.backdrop) || isPreviewSearchResult(result)) {
    return -1;
  }

  const normalizedQueryTitle = normalizeHeroLookupTitle(title);
  const normalizedResultTitle = normalizeHeroLookupTitle(result.title);

  let score = 0;

  if (normalizedResultTitle === normalizedQueryTitle) {
    score += 100;
  } else if (
    normalizedResultTitle.includes(normalizedQueryTitle) ||
    normalizedQueryTitle.includes(normalizedResultTitle)
  ) {
    score += 60;
  } else {
    return -1;
  }

  if (year && result.year === year) {
    score += 20;
  }

  if (result.backdrop) {
    score += 45;
  }

  if (result.poster) {
    score += 5;
  }

  const sourcePriorityIndex = HERO_POSTER_SOURCE_PRIORITY.indexOf(
    result.source
  );
  if (sourcePriorityIndex >= 0) {
    score += HERO_POSTER_SOURCE_PRIORITY.length - sourcePriorityIndex;
  }

  return score;
}

function getRankedHeroSearchResults(
  results: SearchResult[],
  title: string,
  year?: string
): SearchResult[] {
  return results
    .map((result) => ({
      result,
      score: getHeroSearchResultScore(result, title, year),
    }))
    .filter((entry) => entry.score >= 0)
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.result);
}

function getHeroSourceItemScore(item: HeroSourceItem): number {
  let score = 0;

  if ('mediaType' in item) {
    score += item.backdrop ? 120 : 80;
    if (item.overview) {
      score += 15;
    }
  } else if ('type' in item) {
    score += 55;
    if (item.summary) {
      score += 10;
    }
  } else {
    score += 35;
  }

  if (item.poster) {
    score += 10;
  }

  return score;
}

function pickBestHeroSourceByTitle(
  items: HeroSourceItem[],
  title: string
): HeroSourceItem | null {
  const normalizedTitle = normalizeHeroLookupTitle(title);

  const matches = items.filter(
    (item) => normalizeHeroLookupTitle(item.title) === normalizedTitle
  );

  if (matches.length === 0) {
    return null;
  }

  return matches.sort(
    (left, right) =>
      getHeroSourceItemScore(right) - getHeroSourceItemScore(left)
  )[0];
}

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
  const [hotVarietyShows, setHotVarietyShows] = useState<DoubanItem[]>([]);
  const [heroDownstreamAssets, setHeroDownstreamAssets] = useState<
    Record<string, HeroVisualAsset>
  >({});
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
          varietyShowsData,
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
          getDoubanCategories({ kind: 'tv', category: 'show', type: 'show' }),
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
          varietyShowsData.status === 'fulfilled' &&
          varietyShowsData.value.code === 200
        ) {
          setHotVarietyShows(varietyShowsData.value.list);
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
  const homeSectionItemLimit = 15;
  const rankingItemLimit = 12;

  type HeroContent = {
    title?: string;
    poster?: string;
    backdrop?: string;
    overview?: string;
    summary?: string;
  };

  const fallbackHeroSource = [
    ...displayMovies.slice(0, HERO_FALLBACK_MOVIE_POOL_LIMIT),
    ...displayTvShows.slice(0, HERO_FALLBACK_TV_POOL_LIMIT),
  ];
  const curatedHeroPool: HeroSourceItem[] = [
    ...tmdbMovies,
    ...tmdbTvShows,
    ...hotMovies,
    ...hotTvShows,
    ...traktMovies,
    ...traktTvShows,
  ];
  const curatedHeroSource = CURATED_HERO_TITLES.map((title) =>
    pickBestHeroSourceByTitle(curatedHeroPool, title)
  ).filter(Boolean) as HeroSourceItem[];
  const heroSourceItems = [
    ...curatedHeroSource,
    ...fallbackHeroSource.filter(
      (item) =>
        !curatedHeroSource.some(
          (curatedItem) =>
            normalizeHeroLookupTitle(curatedItem.title) ===
            normalizeHeroLookupTitle(item.title)
        )
    ),
  ].slice(0, HERO_SLIDE_LIMIT);
  const heroLookupTargets = heroSourceItems
    .filter((item) => !(item as TmdbItem).backdrop)
    .slice(0, HERO_FALLBACK_LOOKUP_LIMIT)
    .map((item) => ({
      title: item.title,
      year: item.year,
    }));
  const shouldLookupDownstreamHeroPosters = heroLookupTargets.length > 0;
  const heroLookupKey = heroLookupTargets
    .map((item) => `${item.title}::${item.year || ''}`)
    .join('|');

  const heroSlides: HeroContent[] = heroSourceItems.map((item) => {
    const downstreamAsset = heroDownstreamAssets[item.title] || {};

    return {
      title: item.title,
      poster: downstreamAsset.poster || item.poster,
      backdrop: (item as any).backdrop || downstreamAsset.backdrop,
      overview: (item as any).overview,
      summary: (item as any).summary,
    };
  });

  const heroItem = heroSlides[heroIndex];
  const heroTitle = heroItem?.title || announcement || t('featuredContent');
  const heroBackdropImageUrl = heroItem?.backdrop
    ? processImageUrl(getHighQualityHeroImageUrl(heroItem.backdrop))
    : '';
  const heroPosterImageUrl = heroItem?.poster
    ? processImageUrl(getHighQualityHeroImageUrl(heroItem.poster))
    : '';
  const heroPosterSliceImageUrl = heroItem?.poster
    ? processImageUrl(getOptimizedHeroSliceImageUrl(heroItem.poster))
    : heroPosterImageUrl;
  const heroBackdropSliceImageUrl = heroItem?.backdrop
    ? processImageUrl(getOptimizedHeroSliceImageUrl(heroItem.backdrop))
    : '';
  const heroSliceImageUrl =
    heroPosterSliceImageUrl || heroBackdropSliceImageUrl;
  const heroDisplayImageUrl = heroBackdropImageUrl || heroPosterImageUrl;
  const heroUsesPosterFallback = Boolean(heroSliceImageUrl);
  const heroSummary = heroItem?.overview || heroItem?.summary || '';

  const rankingItems = displayMovies
    .slice(0, rankingItemLimit)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
      group: t('movie'),
    }));
  const seriesRankingItems = displayTvShows
    .slice(0, rankingItemLimit)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
      group: t('hotSeries'),
    }));

  const getRankingProviderLabel = (item: DoubanItem | TmdbItem | TraktItem) => {
    if ('mediaType' in item) return 'TMDb';
    if ('type' in item) return 'Trakt';
    return '豆瓣';
  };

  const getRankingContentType = (
    item: DoubanItem | TmdbItem | TraktItem,
    fallbackType?: OmdbItem['type']
  ) => {
    if ('mediaType' in item) return item.mediaType;
    if ('type' in item) return item.type;
    return fallbackType;
  };

  const getRankingTypeLabel = (
    contentType:
      | TmdbItem['mediaType']
      | TraktItem['type']
      | OmdbItem['type']
      | undefined,
    fallbackType: 'movie' | 'tv'
  ) => {
    const resolvedType =
      contentType === 'show' ||
      contentType === 'series' ||
      contentType === 'episode'
        ? 'tv'
        : contentType || fallbackType;

    return resolvedType === 'movie' ? t('movie') : t('tv');
  };
  const movieGridItems = displayMovies.slice(0, homeSectionItemLimit);
  const seriesGridItems = displayTvShows.slice(0, homeSectionItemLimit);
  const varietySourceItems =
    hotVarietyShows.length > 0
      ? hotVarietyShows
      : hotTvShows.length > 0
      ? hotTvShows
      : displayTvShows;
  const varietyGridItems = varietySourceItems.slice(0, homeSectionItemLimit);

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
    if (!shouldLookupDownstreamHeroPosters || heroLookupTargets.length === 0) {
      setHeroDownstreamAssets({});
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    const fetchHeroBackdropFromDetail = async (
      result: SearchResult
    ): Promise<HeroVisualAsset> => {
      if (result.backdrop) {
        return {
          poster: result.poster,
          backdrop: result.backdrop,
        };
      }

      const detailResponse = await fetch(
        `/api/detail?id=${encodeURIComponent(
          result.id
        )}&source=${encodeURIComponent(result.source)}`,
        {
          signal: controller.signal,
        }
      );

      if (!detailResponse.ok) {
        return {
          poster: result.poster,
        };
      }

      const detailData = (await detailResponse.json()) as SearchResult;

      return {
        poster: result.poster || detailData.poster,
        backdrop: detailData.backdrop || result.backdrop,
      };
    };

    const fetchHeroAssetsFromDownstream = async () => {
      const results = await Promise.allSettled(
        heroLookupTargets.map(async ({ title, year }) => {
          const response = await fetch(
            `/api/search?q=${encodeURIComponent(title)}`,
            {
              signal: controller.signal,
            }
          );

          if (!response.ok) {
            return null;
          }

          const data = await response.json();
          const searchResults = Array.isArray(data.results)
            ? (data.results as SearchResult[])
            : [];
          const rankedMatches = getRankedHeroSearchResults(
            searchResults,
            title,
            year
          ).slice(0, HERO_BACKDROP_DETAIL_LOOKUP_LIMIT);

          if (rankedMatches.length === 0) {
            return null;
          }

          let resolvedAsset: HeroVisualAsset | null = null;

          for (const candidate of rankedMatches) {
            const nextAsset = await fetchHeroBackdropFromDetail(candidate);

            if (!resolvedAsset && (nextAsset.poster || nextAsset.backdrop)) {
              resolvedAsset = nextAsset;
            }

            if (nextAsset.backdrop) {
              resolvedAsset = nextAsset;
              break;
            }
          }

          if (!resolvedAsset?.poster && !resolvedAsset?.backdrop) {
            return null;
          }

          return [title, resolvedAsset] as const;
        })
      );

      if (cancelled) {
        return;
      }

      const nextAssetMap: Record<string, HeroVisualAsset> = {};
      results.forEach((result) => {
        if (result.status !== 'fulfilled' || !result.value) {
          return;
        }

        const [title, asset] = result.value;
        nextAssetMap[title] = asset;
      });

      setHeroDownstreamAssets(nextAssetMap);
    };

    fetchHeroAssetsFromDownstream().catch((error) => {
      if ((error as Error).name !== 'AbortError') {
        console.error('获取轮播视频源横图失败:', error);
      }
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [heroLookupKey, shouldLookupDownstreamHeroPosters]);

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
      const visibleShows = displayTvShows.slice(0, homeSectionItemLimit);
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
      const visibleMovies = displayMovies.slice(0, homeSectionItemLimit);
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
      const visibleTvShows = displayTvShows.slice(0, homeSectionItemLimit);
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
                  <section className='relative overflow-hidden rounded-md bg-black shadow-[0_24px_70px_rgba(0,0,0,0.48)] border-[2px] border-black'>
                    {/* Top film perforation strip */}
                    <div className='flex items-center justify-around h-[22px] sm:h-[28px] bg-black px-1 shrink-0'>
                      {Array.from({ length: 24 }, (_, i) => (
                        <div
                          key={`perf-t-${i}`}
                          className='w-[12px] h-[13px] sm:w-[15px] sm:h-[16px] rounded-[2px] bg-neutral-400/[.43]'
                        />
                      ))}
                    </div>
                    <div className='relative aspect-[16/9] sm:aspect-[21/9] overflow-hidden bg-[#141414]'>
                      <div className='absolute inset-0'>
                        {heroSliceImageUrl ? (
                          heroUsesPosterFallback ? (
                            <>
                              <div className='absolute inset-0 grid grid-cols-3 gap-x-0 bg-black px-[1px] py-[3px]'>
                                {HERO_POSTER_SLICE_POSITIONS.map(
                                  (position, index) => (
                                    <div
                                      key={`${position}-${index}`}
                                      className='relative h-full overflow-hidden rounded-none bg-[#020202] p-[4px] shadow-[0_0_0_1px_rgba(0,0,0,0.95),0_8px_20px_rgba(0,0,0,0.16)]'
                                    >
                                      <div className='relative h-full w-full overflow-hidden rounded-none bg-black'>
                                        <div
                                          aria-hidden='true'
                                          className='absolute inset-0 bg-no-repeat opacity-[0.92]'
                                          style={{
                                            backgroundImage: `url("${heroSliceImageUrl}")`,
                                            backgroundPosition: `${position} ${HERO_POSTER_SLICE_Y_POSITION}`,
                                            backgroundSize: '315% auto',
                                          }}
                                        />
                                        <div className='absolute inset-0 bg-[linear-gradient(180deg,_rgba(8,8,8,0.08),_rgba(8,8,8,0.34)_48%,_rgba(8,8,8,0.62))]' />
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                              <div className='absolute inset-0 bg-[radial-gradient(circle_at_72%_24%,_rgba(212,175,55,0.22),_transparent_24%),linear-gradient(135deg,_rgba(8,8,8,0.1),_rgba(8,8,8,0.68))]' />
                            </>
                          ) : null
                        ) : (
                          <div className='h-full w-full bg-[radial-gradient(circle_at_18%_18%,_rgba(212,175,55,0.2),_transparent_42%),linear-gradient(120deg,_#0f0f0f,_#1a1a1a)]' />
                        )}
                        <div
                          className={`absolute inset-0 ${
                            heroUsesPosterFallback
                              ? 'bg-gradient-to-r from-black/92 via-black/46 to-black/8 sm:from-black/88 sm:via-black/28 sm:to-black/6'
                              : 'bg-gradient-to-r from-black/88 via-black/52 to-black/18 sm:from-black/82 sm:via-black/38 sm:to-black/16'
                          }`}
                        />
                        <div
                          className={`absolute inset-0 ${
                            heroUsesPosterFallback
                              ? 'bg-gradient-to-t from-black/88 via-black/22 to-transparent'
                              : 'bg-gradient-to-t from-black/92 via-black/30 to-transparent'
                          }`}
                        />
                      </div>

                      <div className='relative z-10 flex h-full flex-col justify-end p-4 sm:p-6 lg:p-8'>
                        <div className='grid items-end gap-4 sm:gap-5 sm:grid-cols-[minmax(0,1fr)_132px] md:grid-cols-[minmax(0,1fr)_152px] lg:grid-cols-[minmax(0,1fr)_190px]'>
                          <div className='max-w-[34rem]'>
                            <h1 className='text-[1.5rem] font-black leading-tight tracking-tight text-white drop-shadow-[0_10px_24px_rgba(0,0,0,0.35)] sm:text-[2.05rem] lg:text-[2.45rem]'>
                              {heroTitle}
                            </h1>
                            {heroSummary ? (
                              <p className='mt-2.5 max-w-[30rem] overflow-hidden text-[12px] leading-5 text-neutral-200 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3] sm:mt-3 sm:text-[14px] sm:leading-6'>
                                {heroSummary}
                              </p>
                            ) : null}
                            <div
                              className={`${
                                heroSummary ? 'mt-4 sm:mt-5' : 'mt-3'
                              } flex flex-wrap items-center gap-2.5 sm:gap-3`}
                            >
                              <button
                                className='inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#d4af37] to-[#b39028] px-4 py-2.5 text-[13px] font-semibold text-black shadow-[0_14px_32px_rgba(212,175,55,0.3)] transition-transform hover:scale-[1.03] sm:px-6 sm:py-3 sm:text-[15px]'
                                onClick={() => jumpToSearch(heroTitle)}
                              >
                                <PlayCircle className='h-4 w-4 fill-black shrink-0' />
                                {t('watchNow')}
                              </button>
                              <button
                                className='inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-[13px] font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/18 sm:px-6 sm:py-3 sm:text-[15px]'
                                onClick={() => jumpToSearch(heroTitle)}
                              >
                                <Clapperboard className='h-4 w-4 shrink-0' />
                                {t('details')}
                              </button>
                            </div>
                          </div>

                          {heroDisplayImageUrl ? (
                            <div className='hidden sm:flex justify-self-end'>
                              <div className='relative aspect-[2/3] w-[132px] overflow-hidden rounded-[0.8rem] border border-white/15 bg-black/35 shadow-[0_18px_50px_rgba(0,0,0,0.48)] md:w-[152px] lg:w-[190px]'>
                                <img
                                  src={heroDisplayImageUrl}
                                  alt={heroTitle}
                                  className='h-full w-full object-cover'
                                />
                                <div className='absolute inset-0 ring-1 ring-inset ring-white/10' />
                              </div>
                            </div>
                          ) : null}
                        </div>

                        <div className='mt-4 flex items-center justify-between gap-3 sm:mt-5'>
                          <div className='flex items-center gap-1.5 sm:gap-2'>
                            {heroSlides.map((item, index) => (
                              <button
                                key={`${item.title || 'hero'}-${index}`}
                                type='button'
                                aria-label={`Hero slide ${index + 1}`}
                                onClick={() => setHeroIndex(index)}
                                className={
                                  index === heroIndex
                                    ? 'h-1.5 w-8 rounded-full bg-[#d4af37] shadow-[0_0_14px_rgba(212,175,55,0.45)] sm:w-9'
                                    : 'h-1.5 w-4 rounded-full bg-white/25 transition-colors hover:bg-white/45 sm:w-5'
                                }
                              />
                            ))}
                          </div>

                          <div className='flex items-center gap-2'>
                            <button
                              type='button'
                              aria-label='Previous slide'
                              onClick={goPrevHero}
                              disabled={heroSlides.length <= 1}
                              className='inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white/80 backdrop-blur-sm transition-colors hover:bg-[#d4af37] hover:text-black disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:w-10'
                            >
                              <ChevronLeft className='h-4 w-4 sm:h-5 sm:w-5' />
                            </button>
                            <button
                              type='button'
                              aria-label='Next slide'
                              onClick={goNextHero}
                              disabled={heroSlides.length <= 1}
                              className='inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white/80 backdrop-blur-sm transition-colors hover:bg-[#d4af37] hover:text-black disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:w-10'
                            >
                              <ChevronRight className='h-4 w-4 sm:h-5 sm:w-5' />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Bottom film perforation strip */}
                    <div className='flex items-center justify-around h-[22px] sm:h-[28px] bg-black px-1 shrink-0'>
                      {Array.from({ length: 24 }, (_, i) => (
                        <div
                          key={`perf-b-${i}`}
                          className='w-[12px] h-[13px] sm:w-[15px] sm:h-[16px] rounded-[2px] bg-neutral-400/[.43]'
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

                    <div className='grid grid-cols-3 gap-x-1.5 gap-y-7 sm:grid-cols-[repeat(auto-fit,minmax(160px,1fr))] sm:gap-x-6 sm:gap-y-12'>
                      {loading
                        ? Array.from({ length: homeSectionItemLimit }).map(
                            (_, index) => (
                              <div key={index}>
                                <div className='aspect-[2/3] rounded-md sm:rounded-lg bg-white/10 animate-pulse' />
                                <div className='mt-2.5 h-3.5 rounded bg-white/10 animate-pulse' />
                                <div className='mt-1.5 h-3 w-2/3 rounded bg-white/10 animate-pulse' />
                              </div>
                            )
                          )
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
                                <div className='relative aspect-[2/3] overflow-hidden rounded-md sm:rounded-lg border border-white/10 bg-[#1a1a1a]'>
                                  {actualPoster ? (
                                    <img
                                      src={processImageUrl(actualPoster)}
                                      alt={movie.title}
                                      className='h-full w-full object-cover scale-[1.08] transition-transform duration-300 group-hover:scale-[1.14]'
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
                                <h3 className='mt-2 truncate text-[13px] sm:text-sm font-semibold leading-5 text-neutral-100 transition-colors group-hover:text-[#d4af37]'>
                                  {movie.title}
                                </h3>
                                <p className='mt-0.5 text-[11px] sm:text-xs text-neutral-400'>
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
                      <div className='grid grid-cols-3 gap-x-1.5 gap-y-7 sm:grid-cols-[repeat(auto-fit,minmax(160px,1fr))] sm:gap-x-6 sm:gap-y-12'>
                        {loading
                          ? Array.from({ length: homeSectionItemLimit }).map(
                              (_, index) => (
                                <div key={index}>
                                  <div className='aspect-[2/3] rounded-md sm:rounded-lg bg-white/10 animate-pulse' />
                                  <div className='mt-2.5 h-3.5 rounded bg-white/10 animate-pulse' />
                                  <div className='mt-1.5 h-3 w-2/3 rounded bg-white/10 animate-pulse' />
                                </div>
                              )
                            )
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
                                  <div className='relative aspect-[2/3] overflow-hidden rounded-md sm:rounded-lg border border-white/10 bg-[#1a1a1a]'>
                                    {actualPoster ? (
                                      <img
                                        src={processImageUrl(actualPoster)}
                                        alt={show.title}
                                        className='h-full w-full object-cover scale-[1.08] transition-transform duration-300 group-hover:scale-[1.14]'
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
                                  <h3 className='mt-2 truncate text-[13px] sm:text-sm font-semibold leading-5 text-neutral-100 transition-colors group-hover:text-[#d4af37]'>
                                    {show.title}
                                  </h3>
                                  <p className='mt-0.5 text-[11px] sm:text-xs text-neutral-400'>
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
                      <div className='grid grid-cols-3 gap-x-1.5 gap-y-7 sm:grid-cols-[repeat(auto-fit,minmax(160px,1fr))] sm:gap-x-6 sm:gap-y-12'>
                        {loading
                          ? Array.from({ length: homeSectionItemLimit }).map(
                              (_, index) => (
                                <div key={index}>
                                  <div className='aspect-[2/3] rounded-md sm:rounded-lg bg-white/10 animate-pulse' />
                                  <div className='mt-2.5 h-3.5 rounded bg-white/10 animate-pulse' />
                                  <div className='mt-1.5 h-3 w-2/3 rounded bg-white/10 animate-pulse' />
                                </div>
                              )
                            )
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
                                  <div className='relative aspect-[2/3] overflow-hidden rounded-md sm:rounded-lg border border-white/10 bg-[#1a1a1a]'>
                                    {actualPoster ? (
                                      <img
                                        src={processImageUrl(actualPoster)}
                                        alt={item.title}
                                        className='h-full w-full object-cover scale-[1.08] transition-transform duration-300 group-hover:scale-[1.14]'
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
                                  <h3 className='mt-2 truncate text-[13px] sm:text-sm font-semibold leading-5 text-neutral-100 transition-colors group-hover:text-[#d4af37]'>
                                    {item.title}
                                  </h3>
                                  <p className='mt-0.5 text-[11px] sm:text-xs text-neutral-400'>
                                    {varietyYear}
                                  </p>
                                </button>
                              );
                            })}
                      </div>
                    </section>
                  </div>
                </div>

                <aside className='rounded-[1.02rem] sm:rounded-[1.16rem] border border-white/10 bg-[#1a1a1a]/95 p-4 sm:p-5 shadow-[0_24px_70px_rgba(0,0,0,0.35)] xl:sticky xl:top-28 xl:max-h-[calc(100vh-130px)] xl:overflow-auto'>
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

                  <div className='space-y-4 sm:space-y-5'>
                    <section>
                      <p className='mb-2.5 text-lg sm:text-xl lg:text-[1.35rem] font-bold text-white'>
                        {t('movie')}
                      </p>
                      <ol className='divide-y divide-white/10'>
                        {loading
                          ? Array.from({ length: rankingItemLimit }).map(
                              (_, index) => (
                                <li
                                  key={`movie-skeleton-${index}`}
                                  className='flex items-center gap-3 py-1.5 sm:py-2'
                                >
                                  <div className='h-6 w-6 rounded-full bg-white/10 animate-pulse' />
                                  <div className='h-8 sm:h-9 flex-1 rounded-lg bg-white/10 animate-pulse' />
                                </li>
                              )
                            )
                          : rankingItems.map((item) => {
                              const omdbMovie = omdbMovies[item.title];
                              const actualRate = omdbMovie?.rate || item.rate;
                              const metaYear = omdbMovie?.year || item.year;
                              const sourceLabel = getRankingProviderLabel(item);
                              const typeLabel = getRankingTypeLabel(
                                getRankingContentType(item, omdbMovie?.type),
                                'movie'
                              );
                              const top3CrownClass =
                                item.rank === 1
                                  ? 'text-[#f0c94d] drop-shadow-[0_0_8px_rgba(240,201,77,0.45)]'
                                  : item.rank === 2
                                  ? 'text-[#c7ced6] drop-shadow-[0_0_8px_rgba(199,206,214,0.4)]'
                                  : item.rank === 3
                                  ? 'text-[#d89157] drop-shadow-[0_0_8px_rgba(216,145,87,0.4)]'
                                  : 'text-neutral-500';

                              return (
                                <li key={`${item.title}-${item.rank}`}>
                                  <button
                                    className='flex w-full items-start gap-3 py-1.5 sm:py-2 text-left transition-colors hover:text-[#d4af37]'
                                    onClick={() => jumpToSearch(item.title)}
                                  >
                                    <div className='mt-px flex h-7 w-7 items-center justify-center shrink-0'>
                                      {item.rank <= 3 ? (
                                        <Crown
                                          className={`h-5 w-5 ${top3CrownClass}`}
                                        />
                                      ) : (
                                        <span className='text-xs font-semibold text-neutral-500'>
                                          #{item.rank}
                                        </span>
                                      )}
                                    </div>
                                    <div className='min-w-0 flex-1'>
                                      <p className='truncate text-[13px] sm:text-sm font-semibold leading-4 text-neutral-100'>
                                        {item.title}
                                      </p>
                                      <div className='mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] sm:text-[11px] leading-4 text-neutral-500'>
                                        {metaYear && <span>{metaYear}</span>}
                                        <span className='rounded border border-white/15 px-1.5 py-px text-neutral-300'>
                                          {sourceLabel}
                                        </span>
                                        <span>{typeLabel}</span>
                                      </div>
                                    </div>
                                    <p className='text-[13px] sm:text-sm font-bold leading-4 text-[#d4af37]'>
                                      {actualRate || '—'}
                                    </p>
                                  </button>
                                </li>
                              );
                            })}
                      </ol>
                    </section>

                    <section className='border-t border-white/10 pt-3.5 sm:pt-4'>
                      <p className='mb-2.5 text-lg sm:text-xl lg:text-[1.35rem] font-bold text-white'>
                        {t('hotSeries')}
                      </p>
                      <ol className='divide-y divide-white/10'>
                        {loading
                          ? Array.from({ length: rankingItemLimit }).map(
                              (_, index) => (
                                <li
                                  key={`series-skeleton-${index}`}
                                  className='flex items-center gap-3 py-1.5 sm:py-2'
                                >
                                  <div className='h-6 w-6 rounded-full bg-white/10 animate-pulse' />
                                  <div className='h-8 sm:h-9 flex-1 rounded-lg bg-white/10 animate-pulse' />
                                </li>
                              )
                            )
                          : seriesRankingItems.map((item) => {
                              const tvmazeShow = tvmazeTvShows[item.title];
                              const omdbShow = omdbTvShows[item.title];
                              const actualRate =
                                tvmazeShow?.rate || omdbShow?.rate || item.rate;
                              const metaYear =
                                tvmazeShow?.year || omdbShow?.year || item.year;
                              const sourceLabel = getRankingProviderLabel(item);
                              const typeLabel = getRankingTypeLabel(
                                tvmazeShow
                                  ? 'tv'
                                  : getRankingContentType(item, omdbShow?.type),
                                'tv'
                              );
                              const top3CrownClass =
                                item.rank === 1
                                  ? 'text-[#f0c94d] drop-shadow-[0_0_8px_rgba(240,201,77,0.45)]'
                                  : item.rank === 2
                                  ? 'text-[#c7ced6] drop-shadow-[0_0_8px_rgba(199,206,214,0.4)]'
                                  : item.rank === 3
                                  ? 'text-[#d89157] drop-shadow-[0_0_8px_rgba(216,145,87,0.4)]'
                                  : 'text-neutral-500';

                              return (
                                <li key={`${item.title}-${item.rank}-series`}>
                                  <button
                                    className='flex w-full items-start gap-3 py-1.5 sm:py-2 text-left transition-colors hover:text-[#d4af37]'
                                    onClick={() => jumpToSearch(item.title)}
                                  >
                                    <div className='mt-px flex h-7 w-7 items-center justify-center shrink-0'>
                                      {item.rank <= 3 ? (
                                        <Crown
                                          className={`h-5 w-5 ${top3CrownClass}`}
                                        />
                                      ) : (
                                        <span className='text-xs font-semibold text-neutral-500'>
                                          #{item.rank}
                                        </span>
                                      )}
                                    </div>
                                    <div className='min-w-0 flex-1'>
                                      <p className='truncate text-[13px] sm:text-sm font-semibold leading-4 text-neutral-100'>
                                        {item.title}
                                      </p>
                                      <div className='mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] sm:text-[11px] leading-4 text-neutral-500'>
                                        {metaYear && <span>{metaYear}</span>}
                                        <span className='rounded border border-white/15 px-1.5 py-px text-neutral-300'>
                                          {sourceLabel}
                                        </span>
                                        <span>{typeLabel}</span>
                                      </div>
                                    </div>
                                    <p className='text-[13px] sm:text-sm font-bold leading-4 text-[#d4af37]'>
                                      {actualRate || '—'}
                                    </p>
                                  </button>
                                </li>
                              );
                            })}
                      </ol>
                    </section>
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
      <Script
        id='LA_COLLECT'
        charSet='UTF-8'
        src='https://sdk.51.la/js-sdk-pro.min.js'
        strategy='afterInteractive'
        onReady={() => {
          if (hasLaAnalyticsInitialized) return;

          const analytics = (window as LAAnalyticsWindow).LA;
          if (!analytics) return;

          analytics.init(LA_ANALYTICS_CONFIG);
          hasLaAnalyticsInitialized = true;
        }}
      />
      <HomeClient />
    </Suspense>
  );
}
