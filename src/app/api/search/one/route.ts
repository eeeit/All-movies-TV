import { NextResponse } from 'next/server';

import type {
  SearchOneApiErrorResponse,
  SearchOneApiResponse,
} from '@shared/api-contract';

import { getAvailableApiSites, getCacheTime } from '@/lib/config';
import { searchFromApi } from '@/lib/downstream';
// OrionTV 兼容接口
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const resourceId = searchParams.get('resourceId');

  if (!query || !resourceId) {
    const cacheTime = await getCacheTime();
    const errorBody: SearchOneApiErrorResponse = {
      result: null,
      error: '缺少必要参数: q 或 resourceId',
    };
    return NextResponse.json(
      errorBody,
      {
        headers: {
          'Cache-Control': `public, max-age=${cacheTime}`,
        },
      }
    );
  }

  const apiSites = await getAvailableApiSites();

  try {
    // 根据 resourceId 查找对应的 API 站点
    const targetSite = apiSites.find((site) => site.key === resourceId);
    if (!targetSite) {
      const errorBody: SearchOneApiErrorResponse = {
        error: `未找到指定的视频源: ${resourceId}`,
        result: null,
      };
      return NextResponse.json(
        errorBody,
        { status: 404 }
      );
    }

    const results = await searchFromApi(targetSite, query);
    const result = results.filter((r) => r.title === query);
    const cacheTime = await getCacheTime();

    if (result.length === 0) {
      const errorBody: SearchOneApiErrorResponse = {
        error: '未找到结果',
        result: null,
      };
      return NextResponse.json(
        errorBody,
        { status: 404 }
      );
    } else {
      const responseBody: SearchOneApiResponse = { results: result };
      return NextResponse.json(
        responseBody,
        {
          headers: {
            'Cache-Control': `public, max-age=${cacheTime}`,
          },
        }
      );
    }
  } catch (error) {
    const errorBody: SearchOneApiErrorResponse = {
      error: '搜索失败',
      result: null,
    };
    return NextResponse.json(
      errorBody,
      { status: 500 }
    );
  }
}
