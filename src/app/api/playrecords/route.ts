/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import type {
  ApiErrorResponse,
  PlayRecordMutationApiRequest,
  PlayRecordsApiResponse,
  SuccessResponse,
} from '@shared/api-contract';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { db } from '@/lib/db';
import { PlayRecord } from '@/lib/types';
export async function GET(request: NextRequest) {
  try {
    // 从 cookie 获取用户信息
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      const errorBody: ApiErrorResponse = { error: 'Unauthorized' };
      return NextResponse.json(errorBody, { status: 401 });
    }

    const records = await db.getAllPlayRecords(authInfo.username);
    const responseBody: PlayRecordsApiResponse = records;
    return NextResponse.json(responseBody, { status: 200 });
  } catch (err) {
    console.error('获取播放记录失败', err);
    const errorBody: ApiErrorResponse = { error: 'Internal Server Error' };
    return NextResponse.json(errorBody, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // 从 cookie 获取用户信息
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      const errorBody: ApiErrorResponse = { error: 'Unauthorized' };
      return NextResponse.json(errorBody, { status: 401 });
    }

    const body = (await request.json()) as PlayRecordMutationApiRequest;
    const { key, record } = body;

    if (!key || !record) {
      const errorBody: ApiErrorResponse = {
        error: 'Missing key or record',
      };
      return NextResponse.json(errorBody, { status: 400 });
    }

    // 验证播放记录数据
    if (!record.title || !record.source_name || record.index < 1) {
      const errorBody: ApiErrorResponse = { error: 'Invalid record data' };
      return NextResponse.json(errorBody, { status: 400 });
    }

    // 从key中解析source和id
    const [source, id] = key.split('+');
    if (!source || !id) {
      const errorBody: ApiErrorResponse = { error: 'Invalid key format' };
      return NextResponse.json(errorBody, { status: 400 });
    }

    const finalRecord = {
      ...record,
      save_time: record.save_time ?? Date.now(),
    } as PlayRecord;

    await db.savePlayRecord(authInfo.username, source, id, finalRecord);

    const responseBody: SuccessResponse = { success: true };
    return NextResponse.json(responseBody, { status: 200 });
  } catch (err) {
    console.error('保存播放记录失败', err);
    const errorBody: ApiErrorResponse = { error: 'Internal Server Error' };
    return NextResponse.json(errorBody, { status: 500 });
  }
}

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
      // 如果提供了 key，删除单条播放记录
      const [source, id] = key.split('+');
      if (!source || !id) {
        const errorBody: ApiErrorResponse = { error: 'Invalid key format' };
        return NextResponse.json(errorBody, { status: 400 });
      }

      await db.deletePlayRecord(username, source, id);
    } else {
      // 未提供 key，则清空全部播放记录
      // 目前 DbManager 没有对应方法，这里直接遍历删除
      const all = await db.getAllPlayRecords(username);
      await Promise.all(
        Object.keys(all).map(async (k) => {
          const [s, i] = k.split('+');
          if (s && i) await db.deletePlayRecord(username, s, i);
        })
      );
    }

    const responseBody: SuccessResponse = { success: true };
    return NextResponse.json(responseBody, { status: 200 });
  } catch (err) {
    console.error('删除播放记录失败', err);
    const errorBody: ApiErrorResponse = { error: 'Internal Server Error' };
    return NextResponse.json(errorBody, { status: 500 });
  }
}
