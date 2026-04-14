/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import { NextRequest, NextResponse } from 'next/server';

import type {
  AdminSourceApiRequest,
  ApiErrorResponse,
  AuthSuccessResponse,
} from '@shared/api-contract';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { getStorage } from '@/lib/db';
import { IStorage } from '@/lib/types';
// 支持的操作类型
type Action = AdminSourceApiRequest['action'];

interface BaseBody {
  action?: Action;
}

export async function POST(request: NextRequest) {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
  if (storageType === 'localstorage') {
    return NextResponse.json(
      {
        error: '不支持本地存储进行管理员配置',
      },
      { status: 400 }
    );
  }

  try {
    const body = (await request.json()) as AdminSourceApiRequest;
    const { action } = body;

    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      const errorBody: ApiErrorResponse = { error: 'Unauthorized' };
      return NextResponse.json(errorBody, { status: 401 });
    }
    const username = authInfo.username;

    // 基础校验
    const ACTIONS: Action[] = ['add', 'disable', 'enable', 'delete', 'sort'];
    if (!username || !action || !ACTIONS.includes(action)) {
      const errorBody: ApiErrorResponse = { error: '参数格式错误' };
      return NextResponse.json(errorBody, { status: 400 });
    }

    // 获取配置与存储
    const adminConfig = await getConfig();
    const storage: IStorage | null = getStorage();

    // 权限与身份校验
    if (username !== process.env.USERNAME) {
      const userEntry = adminConfig.UserConfig.Users.find(
        (u) => u.username === username
      );
      if (!userEntry || userEntry.role !== 'admin') {
        const errorBody: ApiErrorResponse = { error: '权限不足' };
        return NextResponse.json(errorBody, { status: 401 });
      }
    }

    switch (action) {
      case 'add': {
        const { key, name, api, detail } = body as Extract<
          AdminSourceApiRequest,
          { action: 'add' }
        >;
        if (!key || !name || !api) {
          const errorBody: ApiErrorResponse = { error: '缺少必要参数' };
          return NextResponse.json(errorBody, { status: 400 });
        }
        if (adminConfig.SourceConfig.some((s) => s.key === key)) {
          const errorBody: ApiErrorResponse = { error: '该源已存在' };
          return NextResponse.json(errorBody, { status: 400 });
        }
        adminConfig.SourceConfig.push({
          key,
          name,
          api,
          detail,
          from: 'custom',
          disabled: false,
        });
        break;
      }
      case 'disable': {
        const { key } = body as Extract<
          AdminSourceApiRequest,
          { action: 'disable' }
        >;
        if (!key)
          return NextResponse.json(
            { error: '缺少 key 参数' } as ApiErrorResponse,
            { status: 400 }
          );
        const entry = adminConfig.SourceConfig.find((s) => s.key === key);
        if (!entry)
          return NextResponse.json({ error: '源不存在' } as ApiErrorResponse, {
            status: 404,
          });
        entry.disabled = true;
        break;
      }
      case 'enable': {
        const { key } = body as Extract<
          AdminSourceApiRequest,
          { action: 'enable' }
        >;
        if (!key)
          return NextResponse.json(
            { error: '缺少 key 参数' } as ApiErrorResponse,
            { status: 400 }
          );
        const entry = adminConfig.SourceConfig.find((s) => s.key === key);
        if (!entry)
          return NextResponse.json({ error: '源不存在' } as ApiErrorResponse, {
            status: 404,
          });
        entry.disabled = false;
        break;
      }
      case 'delete': {
        const { key } = body as Extract<
          AdminSourceApiRequest,
          { action: 'delete' }
        >;
        if (!key)
          return NextResponse.json(
            { error: '缺少 key 参数' } as ApiErrorResponse,
            { status: 400 }
          );
        const idx = adminConfig.SourceConfig.findIndex((s) => s.key === key);
        if (idx === -1)
          return NextResponse.json({ error: '源不存在' } as ApiErrorResponse, {
            status: 404,
          });
        const entry = adminConfig.SourceConfig[idx];
        if (entry.from === 'config') {
          return NextResponse.json(
            { error: '该源不可删除' } as ApiErrorResponse,
            { status: 400 }
          );
        }
        adminConfig.SourceConfig.splice(idx, 1);
        break;
      }
      case 'sort': {
        const { order } = body as Extract<
          AdminSourceApiRequest,
          { action: 'sort' }
        >;
        if (!Array.isArray(order)) {
          const errorBody: ApiErrorResponse = { error: '排序列表格式错误' };
          return NextResponse.json(errorBody, { status: 400 });
        }
        const map = new Map(adminConfig.SourceConfig.map((s) => [s.key, s]));
        const newList: typeof adminConfig.SourceConfig = [];
        order.forEach((k) => {
          const item = map.get(k);
          if (item) {
            newList.push(item);
            map.delete(k);
          }
        });
        // 未在 order 中的保持原顺序
        adminConfig.SourceConfig.forEach((item) => {
          if (map.has(item.key)) newList.push(item);
        });
        adminConfig.SourceConfig = newList;
        break;
      }
      default:
        return NextResponse.json({ error: '未知操作' } as ApiErrorResponse, {
          status: 400,
        });
    }

    // 持久化到存储
    if (storage && typeof (storage as any).setAdminConfig === 'function') {
      await (storage as any).setAdminConfig(adminConfig);
    }

    const responseBody: AuthSuccessResponse = { ok: true };
    return NextResponse.json(responseBody, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('视频源管理操作失败:', error);
    const errorBody: ApiErrorResponse = {
      error: '视频源管理操作失败',
      details: (error as Error).message,
    };
    return NextResponse.json(errorBody, { status: 500 });
  }
}
