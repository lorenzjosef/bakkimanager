/**
 * Mobile-specific API endpoints.
 */

import { apiClient } from './client';
import type {
  MobileBootstrapResponse,
  MobileSyncDraftsRequest,
  MobileSyncDraftsResponse,
} from '@bakki/domain';

/**
 * Get bootstrap data for offline cache initialization.
 */
export async function getBootstrap(): Promise<MobileBootstrapResponse> {
  const response = await apiClient.get<MobileBootstrapResponse>('/mobile/bootstrap');
  return response.data;
}

export async function getBootstrapPage(
  limit: number,
  cursor?: string,
): Promise<MobileBootstrapResponse> {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  if (cursor) {
    params.set('cursor', cursor);
  }
  const response = await apiClient.get<MobileBootstrapResponse>(`/mobile/bootstrap?${params.toString()}`);
  return response.data;
}

/**
 * Sync area drafts to the server.
 */
export async function syncDrafts(
  request: MobileSyncDraftsRequest
): Promise<MobileSyncDraftsResponse> {
  const response = await apiClient.post<MobileSyncDraftsResponse>(
    '/mobile/area-drafts/sync',
    request
  );
  return response.data;
}

export const mobileApi = {
  getBootstrap,
  getBootstrapPage,
  syncDrafts,
};
