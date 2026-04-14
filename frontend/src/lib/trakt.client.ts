import { apiRoutes } from '@shared/api-contract';

import { buildApiUrl } from './api-url';
import { TraktResult } from './types';

interface TraktTrendingParams {
  type: 'movie' | 'show';
}

export async function getTraktTrending(
  params: TraktTrendingParams
): Promise<TraktResult> {
  const response = await fetch(buildApiUrl(apiRoutes.traktTrending, params), {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('获取 Trakt 数据失败');
  }

  return response.json();
}
