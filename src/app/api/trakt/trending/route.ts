import { NextResponse } from 'next/server';

import type {
  ApiErrorResponse,
  TraktItem,
  TraktResult,
  TraktTrendingApiQuery,
} from '@shared/api-contract';

import { getCacheTime } from '@/lib/config';
interface TraktTrendingApiResponse {
  title?: string;
  year?: number;
  rating?: number;
  watchers?: number;
  overview?: string;
  type?: 'movie' | 'show';
  ids?: {
    trakt?: number;
    imdb?: string;
    tmdb?: number;
    tvdb?: number;
    slug?: string;
  };
  images?: {
    poster?: string[];
  };
}

async function fetchTraktTrending(type: TraktTrendingApiQuery['type']) {
  const clientId = process.env.TRAKT_CLIENT_ID || '';

  if (!clientId) {
    return [] as TraktTrendingApiResponse[];
  }

  const target = new URL(`https://api.trakt.tv/${type}s/trending`);
  target.searchParams.set('extended', 'full,images');

  const response = await fetch(target.toString(), {
    headers: {
      'trakt-api-key': clientId,
      'trakt-api-version': '2',
      accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Trakt 请求失败: ${response.status}`);
  }

  return response.json() as Promise<TraktTrendingApiResponse[]>;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') as TraktTrendingApiQuery['type'] | null;

  if (type !== 'movie' && type !== 'show') {
    const errorResponse: ApiErrorResponse = {
      error: 'type 参数必须是 movie 或 show',
    };
    return NextResponse.json(errorResponse, { status: 400 });
  }

  try {
    const data = await fetchTraktTrending(type);
    const list: TraktItem[] = (data || []).map((item) => ({
      id: String(
        item.ids?.trakt ||
          item.ids?.tmdb ||
          item.ids?.tvdb ||
          item.ids?.slug ||
          ''
      ),
      title: (item.title || '').trim(),
      poster: item.images?.poster?.[0] || '',
      rate: item.rating ? item.rating.toFixed(1) : '',
      year: item.year ? String(item.year) : '',
      type,
      summary: item.overview || '',
      watchers: item.watchers || 0,
    }));

    const cacheTime = await getCacheTime();
    const response: TraktResult = {
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
        message: (error as Error).message || '获取 Trakt 数据失败',
        list: [],
      } as TraktResult,
      { status: 500 }
    );
  }
}
