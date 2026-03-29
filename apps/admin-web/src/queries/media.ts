import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateMediaUploadIntentRequest,
  FinalizeMediaUploadRequest,
  FinalizeMediaUploadResponse,
  MediaAssetRecord,
  MediaUploadIntentResponse,
  MediaUploadStatus,
} from '@bakki/domain';
import { fetchApiJson, postApiJson } from '@/lib/api';
import {
  buildUploadObservationPhotoInvalidationQueryKeys,
} from '@/queries/mutation-invalidation-utils';
import { invalidateQueryKeys } from '@/queries/query-invalidation';
import {
  buildObservationPhotosQueryKey,
  MEDIA_STATUS_QUERY_KEY,
} from '@/queries/query-keys';

export function useMediaStatus() {
  return useQuery({
    queryKey: MEDIA_STATUS_QUERY_KEY,
    queryFn: () => fetchApiJson<MediaUploadStatus>('/media/status'),
    retry: false,
    staleTime: 1000 * 60,
  });
}

export function useObservationPhotos(observationId: string | null, enabled = true) {
  return useQuery({
    queryKey: buildObservationPhotosQueryKey(observationId),
    queryFn: () => {
      if (!observationId) {
        return Promise.resolve<MediaAssetRecord[]>([]);
      }

      return fetchApiJson<MediaAssetRecord[]>(`/media/observations/${observationId}/photos`);
    },
    enabled: Boolean(observationId) && enabled,
    retry: false,
  });
}

async function uploadFileToSignedDestination(
  uploadIntent: MediaUploadIntentResponse,
  file: File,
) {
  const response = await fetch(uploadIntent.uploadUrl, {
    method: uploadIntent.method,
    headers: uploadIntent.requiredHeaders,
    body: file,
  });

  if (!response.ok) {
    throw new Error(`Direct upload failed with status ${response.status}.`);
  }
}

export function useUploadObservationPhotoMutation(observationId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      caption,
      displayName,
      file,
    }: {
      caption?: string;
      displayName?: string;
      file: File;
    }) => {
      if (!observationId) {
        throw new Error('No observation owner is selected for photo upload.');
      }

      const intentPayload: CreateMediaUploadIntentRequest = {
        caption,
        displayName,
        fileName: file.name,
        fileSizeBytes: file.size,
        mimeType: file.type || 'application/octet-stream',
      };

      const uploadIntent = await postApiJson<MediaUploadIntentResponse>(
        `/media/observations/${observationId}/uploads`,
        intentPayload,
      );

      await uploadFileToSignedDestination(uploadIntent, file);

      const finalizePayload: FinalizeMediaUploadRequest = {
        assetUrl: uploadIntent.assetUrl,
        caption,
        displayName,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        objectKey: uploadIntent.objectKey,
      };

      return postApiJson<FinalizeMediaUploadResponse>(
        `/media/observations/${observationId}/photos`,
        finalizePayload,
      );
    },
    onSuccess: async () => {
      await invalidateQueryKeys(
        queryClient,
        buildUploadObservationPhotoInvalidationQueryKeys(observationId),
      );
    },
  });
}
