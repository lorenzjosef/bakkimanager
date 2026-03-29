import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import type {
  BakkiMediaProvider,
  FinalizeMediaUploadRequest,
  MediaAssetRecord,
  MediaUploadStatus,
} from '@bakki/domain';

export type MediaOwnerType = 'task' | 'observation';

export interface MediaStorageConfig {
  accessKey: string;
  bucket: string;
  cdnBaseUrl: string;
  endpoint: string;
  localMediaRoot: string;
  maxUploadBytes: number;
  provider: BakkiMediaProvider;
  region: string;
  secretKey: string;
  signedUploadTtlSeconds: number;
}

export function createMediaStorageConfig(): MediaStorageConfig {
  const configuredPath = process.env.LOCAL_MEDIA_ROOT?.trim();
  const localRoot = configuredPath
    ? path.resolve(configuredPath)
    : path.resolve(process.cwd(), '.local/media');

  mkdirSync(localRoot, { recursive: true });

  return {
    accessKey: process.env.SPACES_KEY?.trim() ?? '',
    bucket: process.env.SPACES_BUCKET?.trim() ?? '',
    cdnBaseUrl: process.env.SPACES_CDN_BASE_URL?.trim() ?? '',
    endpoint: process.env.SPACES_ENDPOINT?.trim() ?? '',
    localMediaRoot: localRoot,
    maxUploadBytes: 25 * 1024 * 1024,
    provider: resolveProvider(),
    region: process.env.SPACES_REGION?.trim() ?? '',
    secretKey: process.env.SPACES_SECRET?.trim() ?? '',
    signedUploadTtlSeconds: 15 * 60,
  };
}

export function buildUploadStatus(config: MediaStorageConfig): MediaUploadStatus {
  if (config.provider === 'local-filesystem') {
    return {
      provider: config.provider,
      configured: true,
      bucket: null,
      endpoint: config.localMediaRoot,
      region: null,
      cdnBaseUrl: null,
      missingFields: [],
      supportsDirectUploadSigning: false,
      supportedOwners: ['task', 'observation'],
      message: 'Local filesystem media storage is enabled for development. DigitalOcean Spaces remains the production provider.',
    };
  }

  const configured = hasStorageConfig(config);
  const missingFields = listMissingStorageFields(config);

  return {
    provider: config.provider,
    configured,
    bucket: config.bucket || null,
    endpoint: config.endpoint || null,
    region: config.region || null,
    cdnBaseUrl: config.cdnBaseUrl || null,
    missingFields,
    supportsDirectUploadSigning: configured,
    supportedOwners: ['task', 'observation'],
    message: configured
      ? 'Media provider configuration is present. Signed upload issuance is available.'
      : `Media provider configuration is incomplete.${missingFields.length > 0 ? ` Missing: ${missingFields.join(', ')}.` : ''}`,
  };
}

export function hasStorageConfig(config: MediaStorageConfig) {
  if (config.provider === 'local-filesystem') {
    return true;
  }

  return Boolean(
    config.bucket
    && config.endpoint
    && config.region
    && config.accessKey
    && config.secretKey,
  );
}

export function listMissingStorageFields(config: MediaStorageConfig) {
  if (config.provider === 'local-filesystem') {
    return [];
  }

  const missing: string[] = [];
  if (!config.bucket) {
    missing.push('SPACES_BUCKET');
  }
  if (!config.endpoint) {
    missing.push('SPACES_ENDPOINT');
  }
  if (!config.region) {
    missing.push('SPACES_REGION');
  }
  if (!config.accessKey) {
    missing.push('SPACES_KEY');
  }
  if (!config.secretKey) {
    missing.push('SPACES_SECRET');
  }
  return missing;
}

export function parseRequiredOwnerId(value: string, ownerType: MediaOwnerType) {
  const numericId = parseNumericId(value);
  if (!numericId) {
    throw new BadRequestException(`Invalid ${ownerType} identifier.`);
  }
  return numericId;
}

export function buildObjectKey(ownerType: MediaOwnerType, ownerId: number, fileName: string) {
  const extension = extractExtension(fileName);
  return `bakki/${ownerType}/${ownerId}/${randomUUID()}${extension}`;
}

export function normalizeObjectKey(objectKey: string) {
  return objectKey.replace(/^\/+/, '').trim();
}

export function ensureExpectedObjectKey(ownerType: MediaOwnerType, ownerId: number, objectKey: string) {
  const expectedPrefix = `bakki/${ownerType}/${ownerId}/`;
  if (!objectKey.startsWith(expectedPrefix)) {
    throw new BadRequestException('Object key does not belong to the requested media owner.');
  }
}

export function resolveAssetUrl(config: MediaStorageConfig, objectKey: string) {
  if (config.provider === 'local-filesystem') {
    return null;
  }

  if (config.cdnBaseUrl) {
    return `${config.cdnBaseUrl.replace(/\/+$/, '')}/${objectKey}`;
  }

  if (!config.bucket || !config.endpoint) {
    return null;
  }

  return `${getBucketBaseUrl(config)}/${objectKey}`;
}

export function buildOwnerRef(ownerType: MediaOwnerType, ownerId: number) {
  return ownerType === 'task' ? `task-${ownerId}` : `observation-${ownerId}`;
}

export function buildFallbackPhotoRecord(
  config: MediaStorageConfig,
  ownerType: MediaOwnerType,
  ownerId: number,
  input: FinalizeMediaUploadRequest,
  objectKey: string,
): MediaAssetRecord {
  return {
    id: `${ownerType}-photo-${randomUUID()}`,
    ownerType,
    ownerId,
    name: input.displayName || input.fileName,
    fileName: input.fileName,
    mimeType: input.mimeType,
    caption: input.caption || null,
    objectKey,
    assetUrl: input.assetUrl || resolveAssetUrl(config, objectKey),
  };
}

export function getBucketBaseUrl(config: MediaStorageConfig) {
  return `https://${getBucketHost(config)}`;
}

export function getBucketHost(config: MediaStorageConfig) {
  const normalizedEndpoint = config.endpoint
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '');
  return `${config.bucket}.${normalizedEndpoint}`;
}

function resolveProvider(): BakkiMediaProvider {
  const configuredProvider = process.env.MEDIA_PROVIDER?.trim().toLowerCase();

  if (configuredProvider === 'local' || configuredProvider === 'local-filesystem') {
    return 'local-filesystem';
  }

  return 'digitalocean-spaces';
}

function parseNumericId(value: string) {
  const match = value.match(/(\d+)$/)?.[1];
  return match ? Number(match) : null;
}

function extractExtension(fileName: string) {
  const sanitized = fileName.trim();
  const index = sanitized.lastIndexOf('.');
  if (index <= 0 || index === sanitized.length - 1) {
    return '';
  }
  return sanitized.slice(index).toLowerCase();
}
