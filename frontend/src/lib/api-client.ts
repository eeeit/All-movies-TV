import {
  AUTH_HEADER_NAME,
  apiRoutes,
  type AdminConfigResult,
  type AdminSiteApiRequest,
  type AdminSourceApiRequest,
  type AdminUserApiRequest,
  type AuthSuccessResponse,
  type DetailApiQuery,
  type DetailApiResponse,
  type DoubanApiQuery,
  type DoubanCategoriesApiQuery,
  type DoubanResult,
  type FavoriteApiItemResponse,
  type FavoriteApiQuery,
  type FavoriteMutationApiRequest,
  type FavoritesApiListResponse,
  type LoginApiRequest,
  type OmdbResult,
  type OmdbSearchApiQuery,
  type PlayRecordApiQuery,
  type PlayRecordMutationApiRequest,
  type PlayRecordsApiResponse,
  type RegisterApiRequest,
  type SearchApiQuery,
  type SearchApiResponse,
  type SearchHistoryApiQuery,
  type SearchHistoryApiResponse,
  type SearchHistoryMutationApiRequest,
  type SearchOneApiQuery,
  type SearchOneApiResponse,
  type SearchResourcesApiResponse,
  type ServerConfigApiResponse,
  type SuccessResponse,
  type TmdbResult,
  type TmdbTrendingApiQuery,
  type TraktResult,
  type TraktTrendingApiQuery,
  type TvmazeResult,
  type TvmazeSearchApiQuery,
} from '@shared/api-contract';

import { getSerializedAuthHeader } from './auth';
import { buildApiUrl, withApiBase } from './api-url';

function extractErrorMessage(payload: unknown, status: number) {
  if (
    payload &&
    typeof payload === 'object' &&
    'error' in payload &&
    typeof (payload as { error?: unknown }).error === 'string'
  ) {
    return (payload as { error: string }).error;
  }

  return `Request failed with status ${status}`;
}

export class ApiClientError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.payload = payload;
  }
}

async function requestJson<TResponse>(
  path: string,
  init?: RequestInit
): Promise<TResponse> {
  const headers = new Headers(init?.headers);
  const authHeader = getSerializedAuthHeader();

  if (authHeader && !headers.has(AUTH_HEADER_NAME)) {
    headers.set(AUTH_HEADER_NAME, authHeader);
  }

  const response = await fetch(withApiBase(path), {
    ...init,
    headers,
    credentials: 'include',
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiClientError(
      extractErrorMessage(payload, response.status),
      response.status,
      payload
    );
  }

  return payload as TResponse;
}

function postJson<TResponse, TBody>(path: string, body: TBody) {
  return requestJson<TResponse>(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

export const apiClient = {
  getServerConfig() {
    return requestJson<ServerConfigApiResponse>(apiRoutes.serverConfig);
  },

  search(query: SearchApiQuery) {
    return requestJson<SearchApiResponse>(buildApiUrl(apiRoutes.search, query));
  },

  searchOne(query: SearchOneApiQuery) {
    return requestJson<SearchOneApiResponse>(
      buildApiUrl(apiRoutes.searchOne, query)
    );
  },

  getSearchResources() {
    return requestJson<SearchResourcesApiResponse>(apiRoutes.searchResources);
  },

  getDetail(query: DetailApiQuery) {
    return requestJson<DetailApiResponse>(buildApiUrl(apiRoutes.detail, query));
  },

  login(body: LoginApiRequest) {
    return postJson<AuthSuccessResponse, LoginApiRequest>(
      apiRoutes.login,
      body
    );
  },

  register(body: RegisterApiRequest) {
    return postJson<AuthSuccessResponse, RegisterApiRequest>(
      apiRoutes.register,
      body
    );
  },

  logout() {
    return requestJson<AuthSuccessResponse>(apiRoutes.logout, {
      method: 'POST',
    });
  },

  getFavorites() {
    return requestJson<FavoritesApiListResponse>(apiRoutes.favorites);
  },

  getFavorite(query: FavoriteApiQuery & { key: string }) {
    return requestJson<FavoriteApiItemResponse>(
      buildApiUrl(apiRoutes.favorites, query)
    );
  },

  saveFavorite(body: FavoriteMutationApiRequest) {
    return postJson<SuccessResponse, FavoriteMutationApiRequest>(
      apiRoutes.favorites,
      body
    );
  },

  deleteFavorite(query?: FavoriteApiQuery) {
    return requestJson<SuccessResponse>(
      buildApiUrl(apiRoutes.favorites, query),
      {
        method: 'DELETE',
      }
    );
  },

  getPlayRecords() {
    return requestJson<PlayRecordsApiResponse>(apiRoutes.playrecords);
  },

  savePlayRecord(body: PlayRecordMutationApiRequest) {
    return postJson<SuccessResponse, PlayRecordMutationApiRequest>(
      apiRoutes.playrecords,
      body
    );
  },

  deletePlayRecord(query?: PlayRecordApiQuery) {
    return requestJson<SuccessResponse>(
      buildApiUrl(apiRoutes.playrecords, query),
      {
        method: 'DELETE',
      }
    );
  },

  getSearchHistory() {
    return requestJson<SearchHistoryApiResponse>(apiRoutes.searchhistory);
  },

  addSearchHistory(body: SearchHistoryMutationApiRequest) {
    return postJson<SuccessResponse, SearchHistoryMutationApiRequest>(
      apiRoutes.searchhistory,
      body
    );
  },

  deleteSearchHistory(query?: SearchHistoryApiQuery) {
    return requestJson<SuccessResponse>(
      buildApiUrl(apiRoutes.searchhistory, query),
      {
        method: 'DELETE',
      }
    );
  },

  getDouban(query: DoubanApiQuery) {
    return requestJson<DoubanResult>(buildApiUrl(apiRoutes.douban, query));
  },

  getDoubanCategories(query: DoubanCategoriesApiQuery) {
    return requestJson<DoubanResult>(
      buildApiUrl(apiRoutes.doubanCategories, query)
    );
  },

  getTmdbTrending(query: TmdbTrendingApiQuery) {
    return requestJson<TmdbResult>(buildApiUrl(apiRoutes.tmdbTrending, query));
  },

  getTraktTrending(query: TraktTrendingApiQuery) {
    return requestJson<TraktResult>(
      buildApiUrl(apiRoutes.traktTrending, query)
    );
  },

  searchTvmaze(query: TvmazeSearchApiQuery) {
    return requestJson<TvmazeResult>(
      buildApiUrl(apiRoutes.tvmazeSearch, query)
    );
  },

  searchOmdb(query: OmdbSearchApiQuery) {
    return requestJson<OmdbResult>(buildApiUrl(apiRoutes.omdbSearch, query));
  },

  getAdminConfig() {
    return requestJson<AdminConfigResult>(apiRoutes.adminConfig);
  },

  updateAdminSite(body: AdminSiteApiRequest) {
    return postJson<AuthSuccessResponse, AdminSiteApiRequest>(
      apiRoutes.adminSite,
      body
    );
  },

  updateAdminSource(body: AdminSourceApiRequest) {
    return postJson<AuthSuccessResponse, AdminSourceApiRequest>(
      apiRoutes.adminSource,
      body
    );
  },

  updateAdminUser(body: AdminUserApiRequest) {
    return postJson<AuthSuccessResponse, AdminUserApiRequest>(
      apiRoutes.adminUser,
      body
    );
  },

  resetAdminConfig() {
    return requestJson<AuthSuccessResponse>(apiRoutes.adminReset);
  },
};
