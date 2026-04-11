import { TmdbResult } from './types';

interface TmdbTrendingParams {
  type: 'movie' | 'tv';
}

export async function getTmdbTrending(
  params: TmdbTrendingParams,
): Promise<TmdbResult> {
  const response = await fetch(`/api/tmdb/trending?type=${params.type}`);

  if (!response.ok) {
    throw new Error('获取 TMDb 数据失败');
  }

  return response.json();
}
