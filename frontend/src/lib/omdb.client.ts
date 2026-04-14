import { apiRoutes } from '@shared/api-contract';

import { buildApiUrl } from './api-url';
import { OmdbResult } from './types';

interface OmdbLookupParams {
  query: string;
  type?: 'movie' | 'series' | 'episode';
}

export async function getOmdbLookup(
  params: OmdbLookupParams
): Promise<OmdbResult> {
  const response = await fetch(
    buildApiUrl(apiRoutes.omdbSearch, {
      q: params.query,
      type: params.type,
    }),
    {
      credentials: 'include',
    }
  );

  if (!response.ok) {
    throw new Error('获取 OMDb 数据失败');
  }

  return response.json();
}
