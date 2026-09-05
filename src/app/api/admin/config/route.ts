/* eslint-disable no-console */

import type { AdminConfigResult, ApiErrorResponse } from '@shared/api-contract';
import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
export async function GET(request: NextRequest) {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
  if (storageType === 'localstorage') {
    const errorBody: ApiErrorResponse = {
      error: '不支持本地存储进行管理员配置',
    };
    return NextResponse.json(errorBody, { status: 400 });
  }

  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    const errorBody: ApiErrorResponse = { error: 'Unauthorized' };
    return NextResponse.json(errorBody, { status: 401 });
  }
  const username = authInfo.username;

  try {
    const config = await getConfig();
    let role: AdminConfigResult['Role'];
    if (username === process.env.USERNAME) {
      role = 'owner';
    } else {
      const user = config.UserConfig.Users.find((u) => u.username === username);
      if (user && user.role === 'admin') {
        role = 'admin';
      } else {
        const errorBody: ApiErrorResponse = {
          error: '你是管理员吗你就访问？',
        };
        return NextResponse.json(errorBody, { status: 401 });
      }
    }
    const result: AdminConfigResult = { Role: role, Config: config };

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store', // 管理员配置不缓存
      },
    });
  } catch (error) {
    console.error('获取管理员配置失败:', error);
    const errorBody: ApiErrorResponse = {
      error: '获取管理员配置失败',
      details: (error as Error).message,
    };
    return NextResponse.json(errorBody, { status: 500 });
  }
}
