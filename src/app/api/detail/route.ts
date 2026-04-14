import { NextResponse } from 'next/server';

import type {
  ApiErrorResponse,
  DetailApiResponse,
} from '@shared/api-contract';

import { getAvailableApiSites, getCacheTime } from '@/lib/config';
import { getDetailFromApi } from '@/lib/downstream';
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const sourceCode = searchParams.get('source');

  if (!id || !sourceCode) {
    const errorBody: ApiErrorResponse = { error: '缺少必要参数' };
    return NextResponse.json(errorBody, { status: 400 });
  }

  if (!/^[\w-]+$/.test(id)) {
    const errorBody: ApiErrorResponse = { error: '无效的视频ID格式' };
    return NextResponse.json(errorBody, { status: 400 });
  }

  try {
    const apiSites = await getAvailableApiSites();
    const apiSite = apiSites.find((site) => site.key === sourceCode);

    if (!apiSite) {
      const errorBody: ApiErrorResponse = { error: '无效的API来源' };
      return NextResponse.json(errorBody, { status: 400 });
    }

    const result = await getDetailFromApi(apiSite, id);
    const cacheTime = await getCacheTime();
    const responseBody: DetailApiResponse = result;

    return NextResponse.json(responseBody, {
      headers: {
        'Cache-Control': `public, max-age=${cacheTime}`,
      },
    });
  } catch (error) {
    const errorBody: ApiErrorResponse = {
      error: (error as Error).message,
    };
    return NextResponse.json(
      errorBody,
      { status: 500 }
    );
  }
}
