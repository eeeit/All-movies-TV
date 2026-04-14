import { AUTH_HEADER_NAME, type AuthPayload } from '@shared/api-contract';

const AUTH_STORAGE_KEY = 'moontv_auth';

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
      const authPayload = JSON.parse(candidate);
      if (authPayload && typeof authPayload === 'object') {
        return authPayload as AuthPayload;
      }
    } catch {
      // try next candidate
    }
  }

  return null;
}

function getAuthInfoFromLocalStorage(): AuthPayload | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const storedAuth = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!storedAuth) {
    return null;
  }

  const parsedAuth = parseAuthPayload(storedAuth);
  if (!parsedAuth) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  return parsedAuth;
}

function getAuthInfoFromCookieValue(): AuthPayload | null {
  if (typeof document === 'undefined') {
    return null;
  }

  try {
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

    return parseAuthPayload(authCookie);
  } catch {
    return null;
  }
}

// Client-side auth helper (browser only)
export function getAuthInfoFromBrowserCookie(): AuthPayload | null {
  return getAuthInfoFromLocalStorage() || getAuthInfoFromCookieValue();
}

export function saveAuthInfo(authPayload?: AuthPayload | null) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!authPayload || Object.keys(authPayload).length === 0) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authPayload));
}

export function clearAuthInfo() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function getSerializedAuthHeader(): string | null {
  const authPayload = getAuthInfoFromBrowserCookie();
  if (!authPayload) {
    return null;
  }

  return encodeURIComponent(JSON.stringify(authPayload));
}

export { AUTH_HEADER_NAME };
