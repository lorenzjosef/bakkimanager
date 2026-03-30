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
  const response = await apiClient.get<MobileBootstrapResponse>('/v1/mobile/bootstrap');
  return response.data;
}

/**
 * Sync area drafts to the server.
 */
export async function syncDrafts(
  request: MobileSyncDraftsRequest
): Promise<MobileSyncDraftsResponse> {
  const response = await apiClient.post<MobileSyncDraftsResponse>(
    '/v1/mobile/area-drafts/sync',
    request
  );
  return response.data;
}

export const mobileApi = {
  getBootstrap,
  syncDrafts,
};
