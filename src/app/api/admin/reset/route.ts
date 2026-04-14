/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import type {
  ApiErrorResponse,
  AuthSuccessResponse,
} from '@shared/api-contract';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { resetConfig } from '@/lib/config';
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

  if (username !== process.env.USERNAME) {
    const errorBody: ApiErrorResponse = { error: '仅支持站长重置配置' };
    return NextResponse.json(errorBody, { status: 401 });
  }

  try {
    await resetConfig();

    const responseBody: AuthSuccessResponse = { ok: true };
    return NextResponse.json(responseBody, {
      headers: {
        'Cache-Control': 'no-store', // 管理员配置不缓存
      },
    });
  } catch (error) {
    const errorBody: ApiErrorResponse = {
      error: '重置管理员配置失败',
      details: (error as Error).message,
    };
    return NextResponse.json(errorBody, { status: 500 });
  }
}
