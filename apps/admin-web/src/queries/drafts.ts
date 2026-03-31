import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  DraftReviewStatus,
  CaptureMethod,
  GeoJsonGeometry,
} from '@bakki/domain';
import { fetchApiJson, requestApiJson, patchApiJson, postApiJson } from '../lib/api';
import {
  MAP_DRAFT_AREAS_QUERY_KEY,
  MAP_MANAGEMENT_DATA_QUERY_KEY,
  MAP_VIEWER_DATA_QUERY_KEY,
} from './query-keys';
import { useSessionStatus } from './auth';

// ============================================================================
// Response Types
// ============================================================================

export interface PendingDraft {
  draftRef: string;
  draftName: string;
  zoneRef: string;
  zoneName: string;
  boundaryGeometry: GeoJsonGeometry | null;
  areaHectaresEstimate: number | null;
  captureMethod: CaptureMethod;
  averageGpsAccuracy: number;
  creatorUserId: number;
  creatorUsername: string | null;
  syncStatus: 'synced' | 'rejected';
  syncErrorMessage: string | null;
  reviewStatus: DraftReviewStatus;
  reviewerUserId: number | null;
  reviewerNotes: string | null;
  reviewedAt: string | null;
  promotedAreaRef: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Fetch all pending area drafts awaiting review.
 */
export function usePendingDraftsQuery() {
  const sessionQuery = useSessionStatus();
  const isOwner = sessionQuery.data?.session?.user.role === 'owner';

  return useQuery({
    queryKey: MAP_DRAFT_AREAS_QUERY_KEY,
    queryFn: () => fetchApiJson<PendingDraft[]>('/mobile/area-drafts/pending'),
    enabled: isOwner,
  });
}

/**
 * Fetch a specific draft by ID.
 */
export function useDraftQuery(draftId: string | null) {
  const sessionQuery = useSessionStatus();
  const isOwner = sessionQuery.data?.session?.user.role === 'owner';

  return useQuery({
    queryKey: ['draft', draftId],
    queryFn: () => fetchApiJson<PendingDraft | null>(`/mobile/area-drafts/${draftId}`),
    enabled: Boolean(draftId) && isOwner,
  });
}

// ============================================================================
// Mutations
// ============================================================================

interface ReviewDraftVariables {
  draftId: string;
  approved: boolean;
  notes?: string;
}

/**
 * Review (approve or reject) a draft.
 */
export function useReviewDraftMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ draftId, approved, notes }: ReviewDraftVariables) =>
      patchApiJson<PendingDraft | null>(`/mobile/area-drafts/${draftId}/review`, {
        approved,
        notes,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MAP_DRAFT_AREAS_QUERY_KEY });
    },
  });
}

/**
 * Promote an approved draft to a real area.
 */
export function usePromoteDraftMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (draftId: string) =>
      postApiJson<string>(`/mobile/area-drafts/${draftId}/promote`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MAP_DRAFT_AREAS_QUERY_KEY });
      // Also invalidate map data since a new area was created
      void queryClient.invalidateQueries({ queryKey: MAP_MANAGEMENT_DATA_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: MAP_VIEWER_DATA_QUERY_KEY });
    },
  });
}

/**
 * Delete a draft.
 */
export function useDeleteDraftMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (draftId: string) =>
      requestApiJson<void>(`/mobile/area-drafts/${draftId}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MAP_DRAFT_AREAS_QUERY_KEY });
    },
  });
}
