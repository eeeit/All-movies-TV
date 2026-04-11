import { NextResponse } from 'next/server';

import { getCacheTime } from '@/lib/config';
import { TvmazeItem, TvmazeResult } from '@/lib/types';

export const runtime = 'edge';

interface TvmazeSearchApiResponse {
  score: number;
  show: {
    id: number;
    name: string;
    image?: {
      medium?: string;
      original?: string;
    } | null;
    rating?: {
      average?: number | null;
    } | null;
    premiered?: string | null;
    summary?: string | null;
    status?: string;
  };
}

async function fetchTvmazeSearch(query: string) {
  const target = `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`;
  const response = await fetch(target);

  if (!response.ok) {
    throw new Error(`TVmaze 请求失败: ${response.status}`);
  }

  return response.json() as Promise<TvmazeSearchApiResponse[]>;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim();

  if (!query) {
    return NextResponse.json({ error: 'q 参数不能为空' }, { status: 400 });
  }

  try {
    const data = await fetchTvmazeSearch(query);
    const list: TvmazeItem[] = (data || []).map((item) => ({
      id: item.show.id.toString(),
      title: item.show.name.trim(),
      poster: item.show.image?.original || item.show.image?.medium || '',
      rate: item.show.rating?.average
        ? item.show.rating.average.toFixed(1)
        : '',
      year: item.show.premiered?.match(/^\d{4}/)?.[0] || '',
      summary: item.show.summary || '',
      score: item.score,
      status: item.show.status || '',
    }));

    const cacheTime = await getCacheTime();
    const response: TvmazeResult = {
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
        message: (error as Error).message || '获取 TVmaze 数据失败',
        list: [],
      } as TvmazeResult,
      { status: 500 },
    );
  }
}
