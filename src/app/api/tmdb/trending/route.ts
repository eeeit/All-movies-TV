import { NextResponse } from 'next/server';

import { getCacheTime } from '@/lib/config';
import { TmdbItem, TmdbResult } from '@/lib/types';
interface TmdbTrendingApiResponse {
  results: Array<{
    id: number;
    title?: string;
    name?: string;
    poster_path?: string | null;
    backdrop_path?: string | null;
    vote_average?: number;
    release_date?: string;
    first_air_date?: string;
    overview?: string;
    media_type?: 'movie' | 'tv';
  }>;
}

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

async function fetchTmdbTrending(type: 'movie' | 'tv') {
  const bearerToken =
    process.env.TMDB_ACCESS_TOKEN || process.env.TMDB_BEARER_TOKEN || '';
  const apiKey = process.env.TMDB_API_KEY || '';

  if (!bearerToken && !apiKey) {
    return { results: [] } as TmdbTrendingApiResponse;
  }

  const target = new URL(`https://api.themoviedb.org/3/trending/${type}/week`);
  target.searchParams.set('language', 'zh-CN');

  const headers: HeadersInit = {
    accept: 'application/json',
  };

  if (bearerToken) {
    headers.Authorization = `Bearer ${bearerToken}`;
  } else {
    target.searchParams.set('api_key', apiKey);
  }

  const response = await fetch(target.toString(), {
    headers,
  });

  if (!response.ok) {
    throw new Error(`TMDb 请求失败: ${response.status}`);
  }

  return response.json() as Promise<TmdbTrendingApiResponse>;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  if (type !== 'movie' && type !== 'tv') {
    return NextResponse.json(
      { error: 'type 参数必须是 movie 或 tv' },
      { status: 400 }
    );
  }

  try {
    const data = await fetchTmdbTrending(type);
    const list: TmdbItem[] = (data.results || []).map((item) => ({
      id: item.id.toString(),
      title: (item.title || item.name || '').trim(),
      poster: item.poster_path
        ? `${TMDB_IMAGE_BASE_URL}${item.poster_path}`
        : '',
      rate: item.vote_average ? item.vote_average.toFixed(1) : '',
      year:
        item.release_date?.match(/^\d{4}/)?.[0] ||
        item.first_air_date?.match(/^\d{4}/)?.[0] ||
        '',
      mediaType: type,
      overview: item.overview || '',
      backdrop: item.backdrop_path
        ? `${TMDB_IMAGE_BASE_URL}${item.backdrop_path}`
        : '',
    }));

    const cacheTime = await getCacheTime();
    const response: TmdbResult = {
      code: 200,
      message: '获取成功',
      list,
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': `public, max-age=${cacheTime}`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        code: 500,
        message: (error as Error).message || '获取 TMDb 数据失败',
        list: [],
      } as TmdbResult,
      { status: 500 }
    );
  }
}
