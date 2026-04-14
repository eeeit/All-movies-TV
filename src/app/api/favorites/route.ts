/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import type {
  ApiErrorResponse,
  FavoriteApiItemResponse,
  FavoriteMutationApiRequest,
  FavoritesApiListResponse,
  SuccessResponse,
} from '@shared/api-contract';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { db } from '@/lib/db';
import { Favorite } from '@/lib/types';
/**
 * GET /api/favorites
 *
 * 支持两种调用方式：
 * 1. 不带 query，返回全部收藏列表（Record<string, Favorite>）。
 * 2. 带 key=source+id，返回单条收藏（Favorite | null）。
 */
export async function GET(request: NextRequest) {
  try {
    // 从 cookie 获取用户信息
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      const errorBody: ApiErrorResponse = { error: 'Unauthorized' };
      return NextResponse.json(errorBody, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    // 查询单条收藏
    if (key) {
      const [source, id] = key.split('+');
      if (!source || !id) {
        const errorBody: ApiErrorResponse = { error: 'Invalid key format' };
        return NextResponse.json(errorBody, { status: 400 });
      }
      const fav = await db.getFavorite(authInfo.username, source, id);
      const responseBody: FavoriteApiItemResponse = fav;
      return NextResponse.json(responseBody, { status: 200 });
    }

    // 查询全部收藏
    const favorites = await db.getAllFavorites(authInfo.username);
    const responseBody: FavoritesApiListResponse = favorites;
    return NextResponse.json(responseBody, { status: 200 });
  } catch (err) {
    console.error('获取收藏失败', err);
    const errorBody: ApiErrorResponse = { error: 'Internal Server Error' };
    return NextResponse.json(errorBody, { status: 500 });
  }
}

/**
 * POST /api/favorites
 * body: { key: string; favorite: Favorite }
 */
export async function POST(request: NextRequest) {
  try {
    // 从 cookie 获取用户信息
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      const errorBody: ApiErrorResponse = { error: 'Unauthorized' };
      return NextResponse.json(errorBody, { status: 401 });
    }

    const body = (await request.json()) as FavoriteMutationApiRequest;
    const { key, favorite } = body;

    if (!key || !favorite) {
      const errorBody: ApiErrorResponse = {
        error: 'Missing key or favorite',
      };
      return NextResponse.json(errorBody, { status: 400 });
    }

    // 验证必要字段
    if (!favorite.title || !favorite.source_name) {
      const errorBody: ApiErrorResponse = { error: 'Invalid favorite data' };
      return NextResponse.json(errorBody, { status: 400 });
    }

    const [source, id] = key.split('+');
    if (!source || !id) {
      const errorBody: ApiErrorResponse = { error: 'Invalid key format' };
      return NextResponse.json(errorBody, { status: 400 });
    }

    const finalFavorite = {
      ...favorite,
      save_time: favorite.save_time ?? Date.now(),
    } as Favorite;

    await db.saveFavorite(authInfo.username, source, id, finalFavorite);

    const responseBody: SuccessResponse = { success: true };
    return NextResponse.json(responseBody, { status: 200 });
  } catch (err) {
    console.error('保存收藏失败', err);
    const errorBody: ApiErrorResponse = { error: 'Internal Server Error' };
    return NextResponse.json(errorBody, { status: 500 });
  }
}

/**
 * DELETE /api/favorites
 *
 * 1. 不带 query -> 清空全部收藏
 * 2. 带 key=source+id -> 删除单条收藏
 */
export async function DELETE(request: NextRequest) {
  try {
    // 从 cookie 获取用户信息
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      const errorBody: ApiErrorResponse = { error: 'Unauthorized' };
      return NextResponse.json(errorBody, { status: 401 });
    }

    const username = authInfo.username;
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (key) {
      // 删除单条
      const [source, id] = key.split('+');
      if (!source || !id) {
        const errorBody: ApiErrorResponse = { error: 'Invalid key format' };
        return NextResponse.json(errorBody, { status: 400 });
      }
      await db.deleteFavorite(username, source, id);
    } else {
      // 清空全部
      const all = await db.getAllFavorites(username);
      await Promise.all(
        Object.keys(all).map(async (k) => {
          const [s, i] = k.split('+');
          if (s && i) await db.deleteFavorite(username, s, i);
        })
      );
    }

    const responseBody: SuccessResponse = { success: true };
    return NextResponse.json(responseBody, { status: 200 });
  } catch (err) {
    console.error('删除收藏失败', err);
    const errorBody: ApiErrorResponse = { error: 'Internal Server Error' };
    return NextResponse.json(errorBody, { status: 500 });
  }
}
