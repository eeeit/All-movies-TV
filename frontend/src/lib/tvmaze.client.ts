import { apiRoutes } from '@shared/api-contract';

import { buildApiUrl } from './api-url';
import { TvmazeResult } from './types';

export async function getTvmazeShowSearch(
  query: string
): Promise<TvmazeResult> {
  const response = await fetch(
    buildApiUrl(apiRoutes.tvmazeSearch, { q: query }),
    {
      credentials: 'include',
    }
  );

  if (!response.ok) {
    throw new Error('获取 TVmaze 数据失败');
  }

  return response.json();
}
