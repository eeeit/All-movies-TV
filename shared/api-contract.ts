export type StorageType = 'localstorage' | 'redis' | 'd1' | 'upstash' | string;

export interface ApiErrorResponse {
  error: string;
  details?: string;
}

export interface ApiSite {
  key: string;
  api: string;
  name: string;
  detail?: string;
}

export interface PlayRecord {
  title: string;
  source_name: string;
  cover: string;
  year: string;
  index: number;
  total_episodes: number;
  play_time: number;
  total_time: number;
  save_time: number;
  search_title: string;
}

export interface Favorite {
  source_name: string;
  total_episodes: number;
  title: string;
  year: string;
  cover: string;
  save_time: number;
  search_title: string;
}

export interface SearchResult {
  id: string;
  title: string;
  poster: string;
  backdrop?: string;
  episodes: string[];
  source: string;
  source_name: string;
  class?: string;
  year: string;
  desc?: string;
  type_name?: string;
  douban_id?: number;
}

export interface DoubanItem {
  id: string;
  title: string;
  poster: string;
  rate: string;
  year: string;
}

export interface DoubanResult {
  code: number;
  message: string;
  list: DoubanItem[];
}

export interface TmdbItem {
  id: string;
  title: string;
  poster: string;
  rate: string;
  year: string;
  mediaType: 'movie' | 'tv';
  overview?: string;
  backdrop?: string;
}

export interface TmdbResult {
  code: number;
  message: string;
  list: TmdbItem[];
}

export interface TvmazeItem {
  id: string;
  title: string;
  poster: string;
  rate: string;
  year: string;
  summary?: string;
  score?: number;
  status?: string;
}

export interface TvmazeResult {
  code: number;
  message: string;
  list: TvmazeItem[];
}

export interface OmdbItem {
  id: string;
  title: string;
  poster: string;
  rate: string;
  year: string;
  type: 'movie' | 'series' | 'episode';
}

export interface OmdbResult {
  code: number;
  message: string;
  list: OmdbItem[];
}

export interface TraktItem {
  id: string;
  title: string;
  poster: string;
  rate: string;
  year: string;
  type: 'movie' | 'show';
  summary?: string;
  watchers?: number;
}

export interface TraktResult {
  code: number;
  message: string;
  list: TraktItem[];
}

export interface AdminConfig {
  SiteConfig: {
    SiteName: string;
    Announcement: string;
    SearchDownstreamMaxPage: number;
    SiteInterfaceCacheTime: number;
    ImageProxy: string;
  };
  UserConfig: {
    AllowRegister: boolean;
    Users: {
      username: string;
      role: 'user' | 'admin' | 'owner';
      banned?: boolean;
    }[];
  };
  SourceConfig: {
    key: string;
    name: string;
    api: string;
    detail?: string;
    from: 'config' | 'custom';
    disabled?: boolean;
  }[];
}

export interface AdminConfigResult {
  Role: 'owner' | 'admin';
  Config: AdminConfig;
}

export interface SearchApiQuery {
  q: string;
}

export interface SearchApiResponse {
  results: SearchResult[];
}

export interface SearchOneApiQuery {
  q: string;
  resourceId: string;
}

export interface SearchOneApiResponse {
  results: SearchResult[];
}

export interface SearchOneApiErrorResponse extends ApiErrorResponse {
  result: null;
}

export type SearchResourcesApiResponse = ApiSite[];

export interface DetailApiQuery {
  id: string;
  source: string;
}

export type DetailApiResponse = SearchResult;

export interface ServerConfigApiResponse {
  SiteName: string;
  StorageType: StorageType;
}

export const AUTH_HEADER_NAME = 'x-moontv-auth';

export interface AuthPayload {
  password?: string;
  username?: string;
  signature?: string;
  timestamp?: number;
}

export interface AuthSuccessResponse {
  ok: true;
  auth?: AuthPayload;
}

export interface AuthErrorResponse extends ApiErrorResponse {
  ok?: false;
}

export interface LoginApiLocalRequest {
  password: string;
}

export interface LoginApiCredentialRequest {
  username: string;
  password: string;
}

export type LoginApiRequest = LoginApiLocalRequest | LoginApiCredentialRequest;

export interface RegisterApiRequest {
  username: string;
  password: string;
}

export interface FavoriteApiQuery {
  key?: string;
}

export interface FavoriteMutationApiRequest {
  key: string;
  favorite: Favorite;
}

export type FavoritesApiListResponse = Record<string, Favorite>;
export type FavoriteApiItemResponse = Favorite | null;

export interface PlayRecordApiQuery {
  key?: string;
}

export interface PlayRecordMutationApiRequest {
  key: string;
  record: PlayRecord;
}

export type PlayRecordsApiResponse = Record<string, PlayRecord>;
export type SearchHistoryApiResponse = string[];

export interface SearchHistoryApiQuery {
  keyword?: string;
}

export interface SearchHistoryMutationApiRequest {
  keyword: string;
}

export interface SuccessResponse {
  success: true;
}

export type AdminSiteApiRequest = {
  SiteName: string;
  Announcement: string;
  SearchDownstreamMaxPage: number;
  SiteInterfaceCacheTime: number;
  ImageProxy: string;
};

export type AdminSourceAction =
  | 'add'
  | 'disable'
  | 'enable'
  | 'delete'
  | 'sort';

export type AdminSourceApiRequest =
  | {
      action: 'add';
      key: string;
      name: string;
      api: string;
      detail?: string;
    }
  | {
      action: 'disable' | 'enable' | 'delete';
      key: string;
    }
  | {
      action: 'sort';
      order: string[];
    };

export type AdminUserAction =
  | 'add'
  | 'ban'
  | 'unban'
  | 'setAdmin'
  | 'cancelAdmin'
  | 'setAllowRegister'
  | 'changePassword'
  | 'deleteUser';

export type AdminUserApiRequest =
  | {
      action: 'add';
      targetUsername: string;
      targetPassword: string;
    }
  | {
      action: 'ban' | 'unban' | 'setAdmin' | 'cancelAdmin' | 'deleteUser';
      targetUsername: string;
    }
  | {
      action: 'changePassword';
      targetUsername: string;
      targetPassword: string;
    }
  | {
      action: 'setAllowRegister';
      allowRegister: boolean;
    };

export interface DoubanApiQuery {
  type: 'tv' | 'movie';
  tag: string;
  pageSize?: number;
  pageStart?: number;
}

export interface DoubanCategoriesApiQuery {
  kind: 'tv' | 'movie';
  category: string;
  type: string;
  limit?: number;
  start?: number;
}

export interface TmdbTrendingApiQuery {
  type: 'movie' | 'tv';
}

export interface TraktTrendingApiQuery {
  type: 'movie' | 'show';
}

export interface TvmazeSearchApiQuery {
  q: string;
}

export interface OmdbSearchApiQuery {
  q: string;
  type?: 'movie' | 'series' | 'episode';
}

export interface ImageProxyApiQuery {
  url: string;
}

export interface ImageProxyApiErrorResponse extends ApiErrorResponse {}

export interface CronApiSuccessResponse {
  success: true;
  message: string;
  timestamp: string;
}

export interface CronApiErrorResponse {
  success: false;
  message: string;
  error: string;
  timestamp: string;
}

export type CronApiResponse = CronApiSuccessResponse | CronApiErrorResponse;

export const apiRoutes = {
  search: '/api/search',
  searchOne: '/api/search/one',
  searchResources: '/api/search/resources',
  detail: '/api/detail',
  login: '/api/login',
  logout: '/api/logout',
  register: '/api/register',
  serverConfig: '/api/server-config',
  favorites: '/api/favorites',
  playrecords: '/api/playrecords',
  searchhistory: '/api/searchhistory',
  douban: '/api/douban',
  doubanCategories: '/api/douban/categories',
  tmdbTrending: '/api/tmdb/trending',
  traktTrending: '/api/trakt/trending',
  tvmazeSearch: '/api/tvmaze/search',
  omdbSearch: '/api/omdb/search',
  imageProxy: '/api/image-proxy',
  cron: '/api/cron',
  adminConfig: '/api/admin/config',
  adminSite: '/api/admin/site',
  adminSource: '/api/admin/source',
  adminUser: '/api/admin/user',
  adminReset: '/api/admin/reset',
} as const;
