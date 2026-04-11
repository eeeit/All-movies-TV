import { NextResponse } from 'next/server';

import { getCacheTime } from '@/lib/config';
import { OmdbItem, OmdbResult } from '@/lib/types';

export const runtime = 'edge';

interface OmdbApiResponse {
  Response: 'True' | 'False';
  Title?: string;
  Year?: string;
  Poster?: string;
  imdbID?: string;
  imdbRating?: string;
  Type?: 'movie' | 'series' | 'episode';
  Search?: Array<{
    Title: string;
    Year: string;
    imdbID: string;
    Type: 'movie' | 'series' | 'episode';
    Poster: string;
  }>;
}

async function fetchOmdb(url: string): Promise<OmdbApiResponse> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`OMDb 请求失败: ${response.status}`);
  }

  return response.json();
}

async function lookupByTitle(
  query: string,
  type?: 'movie' | 'series' | 'episode'
) {
  const apiKey = process.env.OMDB_API_KEY || '';
  if (!apiKey) {
    return { Response: 'False' } as OmdbApiResponse;
  }

  const exactUrl = new URL('https://www.omdbapi.com/');
  exactUrl.searchParams.set('apikey', apiKey);
  exactUrl.searchParams.set('t', query);
  exactUrl.searchParams.set('plot', 'short');
  if (type) {
    exactUrl.searchParams.set('type', type);
  }

  const exact = await fetchOmdb(exactUrl.toString());
  if (exact.Response === 'True') {
    return exact;
  }

  const searchUrl = new URL('https://www.omdbapi.com/');
  searchUrl.searchParams.set('apikey', apiKey);
  searchUrl.searchParams.set('s', query);
  if (type) {
    searchUrl.searchParams.set('type', type);
  }

  const search = await fetchOmdb(searchUrl.toString());
  const first = search.Search?.[0];
  if (!first) {
    return { Response: 'False' } as OmdbApiResponse;
  }

  const detailUrl = new URL('https://www.omdbapi.com/');
  detailUrl.searchParams.set('apikey', apiKey);
  detailUrl.searchParams.set('i', first.imdbID);
  detailUrl.searchParams.set('plot', 'short');

  return fetchOmdb(detailUrl.toString());
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim();
  const type = searchParams.get('type');

  if (!query) {
    return NextResponse.json({ error: 'q 参数不能为空' }, { status: 400 });
  }

  if (type && !['movie', 'series', 'episode'].includes(type)) {
    return NextResponse.json(
      { error: 'type 参数必须是 movie、series 或 episode' },
      { status: 400 }
    );
  }

  try {
    const data = await lookupByTitle(
      query,
      type as 'movie' | 'series' | 'episode' | undefined
    );

    const list: OmdbItem[] =
      data.Response === 'True'
        ? [
            {
              id: data.imdbID || '',
              title: data.Title || '',
              poster: data.Poster && data.Poster !== 'N/A' ? data.Poster : '',
              rate:
                data.imdbRating && data.imdbRating !== 'N/A'
                  ? data.imdbRating
                  : '',
              year: data.Year?.match(/^\d{4}/)?.[0] || '',
              type:
                data.Type ||
                (type as 'movie' | 'series' | 'episode') ||
                'movie',
            },
          ]
        : [];

    const cacheTime = await getCacheTime();
    const response: OmdbResult = {
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
        message: (error as Error).message || '获取 OMDb 数据失败',
        list: [],
      } as OmdbResult,
      { status: 500 }
    );
  }
}
