/* eslint-disable no-console,@typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';

import type {
  ApiErrorResponse,
  AuthErrorResponse,
  AuthPayload,
  AuthSuccessResponse,
  LoginApiCredentialRequest,
  LoginApiLocalRequest,
} from '@shared/api-contract';

import { serializeAuthPayload } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { db } from '@/lib/db';
// 读取存储类型环境变量，默认 localstorage
const STORAGE_TYPE =
  (process.env.NEXT_PUBLIC_STORAGE_TYPE as
    | 'localstorage'
    | 'redis'
    | 'd1'
    | undefined) || 'localstorage';

// 生成签名
async function generateSignature(
  data: string,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);

  // 导入密钥
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // 生成签名
  const signature = await crypto.subtle.sign('HMAC', key, messageData);

  // 转换为十六进制字符串
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// 生成认证信息
async function createAuthPayload(
  username?: string,
  password?: string,
  includePassword = false
): Promise<AuthPayload> {
  const authData: AuthPayload = {};

  // 只在需要时包含 password
  if (includePassword && password) {
    authData.password = password;
  }

  if (username && process.env.PASSWORD) {
    authData.username = username;
    // 使用密码作为密钥对用户名进行签名
    const signature = await generateSignature(username, process.env.PASSWORD);
    authData.signature = signature;
    authData.timestamp = Date.now(); // 添加时间戳防重放攻击
  }

  return authData;
}

// 生成认证Cookie（带签名）
async function generateAuthCookie(
  username?: string,
  password?: string,
  includePassword = false
): Promise<string> {
  return serializeAuthPayload(
    await createAuthPayload(username, password, includePassword)
  );
}

export async function POST(req: NextRequest) {
  try {
    // 本地 / localStorage 模式——仅校验固定密码
    if (STORAGE_TYPE === 'localstorage') {
      const envPassword = process.env.PASSWORD;

      // 未配置 PASSWORD 时直接放行
      if (!envPassword) {
        const responseBody: AuthSuccessResponse = { ok: true };
        const response = NextResponse.json(responseBody);

        // 清除可能存在的认证cookie
        response.cookies.set('auth', '', {
          path: '/',
          expires: new Date(0),
          sameSite: 'lax', // 改为 lax 以支持 PWA
          httpOnly: false, // PWA 需要客户端可访问
          secure: false, // 根据协议自动设置
        });

        return response;
      }

      const { password } = (await req.json()) as LoginApiLocalRequest;
      if (typeof password !== 'string') {
        const errorBody: ApiErrorResponse = { error: '密码不能为空' };
        return NextResponse.json(errorBody, { status: 400 });
      }

      if (password !== envPassword) {
        const errorBody: AuthErrorResponse = {
          ok: false,
          error: '密码错误',
        };
        return NextResponse.json(errorBody, { status: 401 });
      }

      // 验证成功，设置认证cookie
      const authPayload = await createAuthPayload(undefined, password, true);
      const responseBody: AuthSuccessResponse = {
        ok: true,
        auth: authPayload,
      };
      const response = NextResponse.json(responseBody);
      const cookieValue = serializeAuthPayload(authPayload);
      const expires = new Date();
      expires.setDate(expires.getDate() + 7); // 7天过期

      response.cookies.set('auth', cookieValue, {
        path: '/',
        expires,
        sameSite: 'lax', // 改为 lax 以支持 PWA
        httpOnly: false, // PWA 需要客户端可访问
        secure: false, // 根据协议自动设置
      });

      return response;
    }

    // 数据库 / redis 模式——校验用户名并尝试连接数据库
    const { username, password } =
      (await req.json()) as LoginApiCredentialRequest;

    if (!username || typeof username !== 'string') {
      const errorBody: ApiErrorResponse = { error: '用户名不能为空' };
      return NextResponse.json(errorBody, { status: 400 });
    }
    if (!password || typeof password !== 'string') {
      const errorBody: ApiErrorResponse = { error: '密码不能为空' };
      return NextResponse.json(errorBody, { status: 400 });
    }

    // 可能是站长，直接读环境变量
    if (
      username === process.env.USERNAME &&
      password === process.env.PASSWORD
    ) {
      // 验证成功，设置认证cookie
      const authPayload = await createAuthPayload(username, password, false);
      const responseBody: AuthSuccessResponse = {
        ok: true,
        auth: authPayload,
      };
      const response = NextResponse.json(responseBody);
      const cookieValue = serializeAuthPayload(authPayload);
      const expires = new Date();
      expires.setDate(expires.getDate() + 7); // 7天过期

      response.cookies.set('auth', cookieValue, {
        path: '/',
        expires,
        sameSite: 'lax', // 改为 lax 以支持 PWA
        httpOnly: false, // PWA 需要客户端可访问
        secure: false, // 根据协议自动设置
      });

      return response;
    } else if (username === process.env.USERNAME) {
      const errorBody: ApiErrorResponse = { error: '用户名或密码错误' };
      return NextResponse.json(errorBody, { status: 401 });
    }

    const config = await getConfig();
    const user = config.UserConfig.Users.find((u) => u.username === username);
    if (user && user.banned) {
      const errorBody: ApiErrorResponse = { error: '用户被封禁' };
      return NextResponse.json(errorBody, { status: 401 });
    }

    // 校验用户密码
    try {
      const pass = await db.verifyUser(username, password);
      if (!pass) {
        const errorBody: ApiErrorResponse = { error: '用户名或密码错误' };
        return NextResponse.json(errorBody, { status: 401 });
      }

      // 验证成功，设置认证cookie
      const authPayload = await createAuthPayload(username, password, false);
      const responseBody: AuthSuccessResponse = {
        ok: true,
        auth: authPayload,
      };
      const response = NextResponse.json(responseBody);
      const cookieValue = serializeAuthPayload(authPayload);
      const expires = new Date();
      expires.setDate(expires.getDate() + 7); // 7天过期

      response.cookies.set('auth', cookieValue, {
        path: '/',
        expires,
        sameSite: 'lax', // 改为 lax 以支持 PWA
        httpOnly: false, // PWA 需要客户端可访问
        secure: false, // 根据协议自动设置
      });

      return response;
    } catch (err) {
      console.error('数据库验证失败', err);
      const errorBody: ApiErrorResponse = { error: '数据库错误' };
      return NextResponse.json(errorBody, { status: 500 });
    }
  } catch (error) {
    console.error('登录接口异常', error);
    const errorBody: ApiErrorResponse = { error: '服务器错误' };
    return NextResponse.json(errorBody, { status: 500 });
  }
}
