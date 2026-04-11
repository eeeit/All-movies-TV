import { TraktResult } from './types';

interface TraktTrendingParams {
  type: 'movie' | 'show';
}

export async function getTraktTrending(
  params: TraktTrendingParams,
): Promise<TraktResult> {
  const response = await fetch(`/api/trakt/trending?type=${params.type}`);

  if (!response.ok) {
    throw new Error('获取 Trakt 数据失败');
  }

  return response.json();
}
