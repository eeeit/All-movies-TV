import { NextResponse } from 'next/server';

import type {
  ApiErrorResponse,
  SearchResourcesApiResponse,
} from '@shared/api-contract';

import { getAvailableApiSites, getCacheTime } from '@/lib/config';
// OrionTV 兼容接口
export async function GET() {
  try {
    const apiSites = await getAvailableApiSites();
    const cacheTime = await getCacheTime();
    const responseBody: SearchResourcesApiResponse = apiSites;

    return NextResponse.json(responseBody, {
      headers: {
        'Cache-Control': `public, max-age=${cacheTime}`,
      },
    });
  } catch (error) {
    const errorBody: ApiErrorResponse = { error: '获取资源失败' };
    return NextResponse.json(errorBody, { status: 500 });
  }
}
