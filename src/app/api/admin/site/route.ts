/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import { NextRequest, NextResponse } from 'next/server';

import type {
  AdminSiteApiRequest,
  ApiErrorResponse,
  AuthSuccessResponse,
} from '@shared/api-contract';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { getStorage } from '@/lib/db';
export async function POST(request: NextRequest) {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
  if (storageType === 'localstorage') {
    const errorBody: ApiErrorResponse = {
      error: '不支持本地存储进行管理员配置',
    };
    return NextResponse.json(errorBody, { status: 400 });
  }

  try {
    const body = (await request.json()) as AdminSiteApiRequest;

    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      const errorBody: ApiErrorResponse = { error: 'Unauthorized' };
      return NextResponse.json(errorBody, { status: 401 });
    }
    const username = authInfo.username;

    const {
      SiteName,
      Announcement,
      SearchDownstreamMaxPage,
      SiteInterfaceCacheTime,
      ImageProxy,
    } = body;

    // 参数校验
    if (
      typeof SiteName !== 'string' ||
      typeof Announcement !== 'string' ||
      typeof SearchDownstreamMaxPage !== 'number' ||
      typeof SiteInterfaceCacheTime !== 'number' ||
      typeof ImageProxy !== 'string'
    ) {
      const errorBody: ApiErrorResponse = { error: '参数格式错误' };
      return NextResponse.json(errorBody, { status: 400 });
    }

    const adminConfig = await getConfig();
    const storage = getStorage();

    // 权限校验
    if (username !== process.env.USERNAME) {
      // 管理员
      const user = adminConfig.UserConfig.Users.find(
        (u) => u.username === username
      );
      if (!user || user.role !== 'admin') {
        const errorBody: ApiErrorResponse = { error: '权限不足' };
        return NextResponse.json(errorBody, { status: 401 });
      }
    }

    // 更新缓存中的站点设置
    adminConfig.SiteConfig = {
      SiteName,
      Announcement,
      SearchDownstreamMaxPage,
      SiteInterfaceCacheTime,
      ImageProxy,
    };

    // 写入数据库
    if (storage && typeof (storage as any).setAdminConfig === 'function') {
      await (storage as any).setAdminConfig(adminConfig);
    }

    const responseBody: AuthSuccessResponse = { ok: true };
    return NextResponse.json(responseBody, {
      headers: {
        'Cache-Control': 'no-store', // 不缓存结果
      },
    });
  } catch (error) {
    console.error('更新站点配置失败:', error);
    const errorBody: ApiErrorResponse = {
      error: '更新站点配置失败',
      details: (error as Error).message,
    };
    return NextResponse.json(errorBody, { status: 500 });
  }
}
