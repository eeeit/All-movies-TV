import type { SearchResult } from '@shared/api-contract';

import { apiClient } from './api-client';

interface FetchVideoDetailOptions {
  source: string;
  id: string;
  fallbackTitle?: string;
}

/**
 * 根据 source 与 id 获取视频详情。
 * 1. 若传入 fallbackTitle，则先通过统一 API client 搜索精确匹配。
 * 2. 若搜索未命中或未提供 fallbackTitle，则直接通过统一 API client 拉取详情。
 */
export async function fetchVideoDetail({
  source,
  id,
  fallbackTitle = '',
}: FetchVideoDetailOptions): Promise<SearchResult> {
  if (fallbackTitle) {
    try {
      const searchData = await apiClient.searchOne({
        q: fallbackTitle.trim(),
        resourceId: source,
      });
      const exactMatch = searchData.results.find(
        (item) =>
          item.source.toString() === source.toString() &&
          item.id.toString() === id.toString()
      );
      if (exactMatch) {
        return exactMatch;
      }
    } catch {
      // Ignore exact-match fallback failures and retry with detail API.
    }
  }

  const detail = await apiClient.getDetail({ source, id });
  if (!detail) {
    throw new Error('获取视频详情失败');
  }

  return detail;
}
