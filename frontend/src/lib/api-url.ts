type QueryValue = string | number | boolean | undefined | null;

type RuntimeConfig = {
  API_BASE_URL?: string;
};

type RuntimeWindow = Window & {
  RUNTIME_CONFIG?: RuntimeConfig;
};

function normalizeApiBaseUrl(url?: string): string {
  if (!url) {
    return '';
  }

  return url.trim().replace(/\/+$/, '');
}

function getRuntimeApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  return normalizeApiBaseUrl(
    (window as RuntimeWindow).RUNTIME_CONFIG?.API_BASE_URL
  );
}

function isAbsoluteUrl(path: string): boolean {
  return /^https?:\/\//i.test(path);
}

function normalizeApiPath(path: string): string {
  if (isAbsoluteUrl(path)) {
    return path;
  }

  return path.startsWith('/') ? path : `/${path}`;
}

export function getApiBaseUrl(): string {
  return (
    getRuntimeApiBaseUrl() ||
    normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL)
  );
}

export function withApiBase(path: string): string {
  const normalizedPath = normalizeApiPath(path);

  if (isAbsoluteUrl(normalizedPath)) {
    return normalizedPath;
  }

  const apiBaseUrl = getApiBaseUrl();
  return apiBaseUrl ? `${apiBaseUrl}${normalizedPath}` : normalizedPath;
}

export function buildApiUrl<TQuery extends object>(
  path: string,
  query?: TQuery
): string {
  const resolvedPath = withApiBase(path);

  if (!query) {
    return resolvedPath;
  }

  const [pathname, existingQuery = ''] = resolvedPath.split('?');
  const searchParams = new URLSearchParams(existingQuery);

  Object.entries(query as Record<string, QueryValue>).forEach(
    ([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return;
      }

      searchParams.set(key, String(value));
    }
  );

  const queryString = searchParams.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}
