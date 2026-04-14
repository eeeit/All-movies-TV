/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import type {
  ApiErrorResponse,
  SearchHistoryApiResponse,
  SearchHistoryMutationApiRequest,
  SuccessResponse,
} from '@shared/api-contract';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { db } from '@/lib/db';
// 最大保存条数（与客户端保持一致）
const HISTORY_LIMIT = 20;

/**
 * GET /api/searchhistory
 * 返回 string[]
 */
export async function GET(request: NextRequest) {
  try {
    // 从 cookie 获取用户信息
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      const errorBody: ApiErrorResponse = { error: 'Unauthorized' };
      return NextResponse.json(errorBody, { status: 401 });
    }

    const history = await db.getSearchHistory(authInfo.username);
    const responseBody: SearchHistoryApiResponse = history;
    return NextResponse.json(responseBody, { status: 200 });
  } catch (err) {
    console.error('获取搜索历史失败', err);
    const errorBody: ApiErrorResponse = { error: 'Internal Server Error' };
    return NextResponse.json(errorBody, { status: 500 });
  }
}

/**
 * POST /api/searchhistory
 * body: { keyword: string }
 */
export async function POST(request: NextRequest) {
  try {
    // 从 cookie 获取用户信息
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      const errorBody: ApiErrorResponse = { error: 'Unauthorized' };
      return NextResponse.json(errorBody, { status: 401 });
    }

    const body = (await request.json()) as SearchHistoryMutationApiRequest;
    const keyword = body.keyword?.trim();

    if (!keyword) {
      const errorBody: ApiErrorResponse = { error: 'Keyword is required' };
      return NextResponse.json(errorBody, { status: 400 });
    }

    await db.addSearchHistory(authInfo.username, keyword);

    // 再次获取最新列表，确保客户端与服务端同步
    const history = await db.getSearchHistory(authInfo.username);
    const responseBody: SearchHistoryApiResponse = history.slice(
      0,
      HISTORY_LIMIT
    );
    return NextResponse.json(responseBody, { status: 200 });
  } catch (err) {
    console.error('添加搜索历史失败', err);
    const errorBody: ApiErrorResponse = { error: 'Internal Server Error' };
    return NextResponse.json(errorBody, { status: 500 });
  }
}

/**
 * DELETE /api/searchhistory?keyword=<kw>
 *
 * 1. 不带 keyword -> 清空全部搜索历史
 * 2. 带 keyword=<kw> -> 删除单条关键字
 */
export async function DELETE(request: NextRequest) {
  try {
    // 从 cookie 获取用户信息
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      const errorBody: ApiErrorResponse = { error: 'Unauthorized' };
      return NextResponse.json(errorBody, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const kw = searchParams.get('keyword')?.trim();

    await db.deleteSearchHistory(authInfo.username, kw || undefined);

    const responseBody: SuccessResponse = { success: true };
    return NextResponse.json(responseBody, { status: 200 });
  } catch (err) {
    console.error('删除搜索历史失败', err);
    const errorBody: ApiErrorResponse = { error: 'Internal Server Error' };
    return NextResponse.json(errorBody, { status: 500 });
  }
}
