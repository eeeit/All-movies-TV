import { OmdbResult } from './types';

interface OmdbLookupParams {
  query: string;
  type?: 'movie' | 'series' | 'episode';
}

export async function getOmdbLookup(
  params: OmdbLookupParams,
): Promise<OmdbResult> {
  const response = await fetch(
    `/api/omdb/search?q=${encodeURIComponent(params.query)}${
      params.type ? `&type=${params.type}` : ''
    }`,
  );

  if (!response.ok) {
    throw new Error('获取 OMDb 数据失败');
  }

  return response.json();
}
