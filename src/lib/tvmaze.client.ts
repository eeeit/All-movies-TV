import { TvmazeResult } from './types';

export async function getTvmazeShowSearch(
  query: string,
): Promise<TvmazeResult> {
  const response = await fetch(
    `/api/tvmaze/search?q=${encodeURIComponent(query)}`,
  );

  if (!response.ok) {
    throw new Error('获取 TVmaze 数据失败');
  }

  return response.json();
}
