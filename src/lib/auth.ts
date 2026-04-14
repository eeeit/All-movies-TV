import { NextRequest } from 'next/server';

import { AUTH_HEADER_NAME, type AuthPayload } from '@shared/api-contract';

function parseAuthPayload(value: string): AuthPayload | null {
  const attempts = [value];

  try {
    const decoded = decodeURIComponent(value);
    attempts.push(decoded);

    if (decoded.includes('%')) {
      attempts.push(decodeURIComponent(decoded));
    }
  } catch {
    // ignore malformed URI sequences and fall back to raw JSON parsing
  }

  for (const candidate of attempts) {
    try {
      const authData = JSON.parse(candidate);
      if (authData && typeof authData === 'object') {
        return authData as AuthPayload;
      }
    } catch {
      // try next candidate
    }
  }

  return null;
}

export function serializeAuthPayload(authPayload: AuthPayload): string {
  return encodeURIComponent(JSON.stringify(authPayload));
}

// 从 header / cookie 获取认证信息 (服务端使用)
export function getAuthInfoFromCookie(
  request: NextRequest
): AuthPayload | null {
  const authHeader = request.headers.get(AUTH_HEADER_NAME);
  if (authHeader) {
    const authFromHeader = parseAuthPayload(authHeader);
    if (authFromHeader) {
      return authFromHeader;
    }
  }

  const authCookie = request.cookies.get('auth');
  if (!authCookie) {
    return null;
  }

  return parseAuthPayload(authCookie.value);
}

// 从cookie获取认证信息 (客户端使用)
export function getAuthInfoFromBrowserCookie(): {
  password?: string;
  username?: string;
  signature?: string;
  timestamp?: number;
} | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    // 解析 document.cookie
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const trimmed = cookie.trim();
      const firstEqualIndex = trimmed.indexOf('=');

      if (firstEqualIndex > 0) {
        const key = trimmed.substring(0, firstEqualIndex);
        const value = trimmed.substring(firstEqualIndex + 1);
        if (key && value) {
          acc[key] = value;
        }
      }

      return acc;
    }, {} as Record<string, string>);

    const authCookie = cookies['auth'];
    if (!authCookie) {
      return null;
    }

    // 处理可能的双重编码
    let decoded = decodeURIComponent(authCookie);

    // 如果解码后仍然包含 %，说明是双重编码，需要再次解码
    if (decoded.includes('%')) {
      decoded = decodeURIComponent(decoded);
    }

    const authData = JSON.parse(decoded);
    return authData;
  } catch (error) {
    return null;
  }
}
