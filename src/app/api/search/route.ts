import { NextResponse } from 'next/server';

import type {
  ApiErrorResponse,
  SearchApiResponse,
} from '@shared/api-contract';

import { getAvailableApiSites, getCacheTime } from '@/lib/config';
import { searchFromApi } from '@/lib/downstream';
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    const cacheTime = await getCacheTime();
    const responseBody: SearchApiResponse = { results: [] };
    return NextResponse.json(
      responseBody,
      {
        headers: {
          'Cache-Control': `public, max-age=${cacheTime}`,
        },
      }
    );
  }

  const apiSites = await getAvailableApiSites();
  const searchPromises = apiSites.map((site) => searchFromApi(site, query));

  try {
    const results = await Promise.all(searchPromises);
    const flattenedResults = results.flat();
    const cacheTime = await getCacheTime();
    const responseBody: SearchApiResponse = {
      results: flattenedResults,
    };

    return NextResponse.json(
      responseBody,
      {
        headers: {
          'Cache-Control': `public, max-age=${cacheTime}`,
        },
      }
    );
  } catch (error) {
    const errorBody: ApiErrorResponse = { error: '搜索失败' };
    return NextResponse.json(errorBody, { status: 500 });
  }
}
