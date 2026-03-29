export type BakkiMediaOwnerType = 'task' | 'observation';
export type BakkiMediaProvider = 'digitalocean-spaces' | 'local-filesystem';

export interface MediaUploadStatus {
  provider: BakkiMediaProvider;
  configured: boolean;
  bucket: string | null;
  endpoint: string | null;
  region: string | null;
  cdnBaseUrl: string | null;
  missingFields: string[];
  supportsDirectUploadSigning: boolean;
  supportedOwners: BakkiMediaOwnerType[];
  message: string;
}

export interface MediaAssetRecord {
  id: string;
  ownerType: BakkiMediaOwnerType;
  ownerId: number;
  name: string;
  fileName: string | null;
  mimeType: string | null;
  caption: string | null;
  assetUrl: string | null;
  objectKey: string | null;
}

export interface CreateMediaUploadIntentRequest {
  caption?: string;
  displayName?: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
}

export interface MediaUploadIntentResponse {
  assetUrl: string | null;
  expiresAt: string;
  maxFileSizeBytes: number;
  method: 'PUT';
  objectKey: string;
  ownerId: number;
  ownerType: BakkiMediaOwnerType;
  requiredHeaders: Record<string, string>;
  uploadUrl: string;
}

export interface FinalizeMediaUploadRequest {
  assetUrl?: string | null;
  caption?: string;
  displayName?: string;
  fileName: string;
  mimeType: string;
  objectKey: string;
}

export interface FinalizeMediaUploadResponse {
  photo: MediaAssetRecord;
}
