import { randomUUID } from 'node:crypto';
import type {
  MediaSigningProbeResult,
  MediaUploadProbeResult,
} from '@bakki/domain';
import type { MediaStorageConfig } from './media.service.storage';
import { createSignedObjectUrl, createSignedPutUrl, probeBucketReachability } from './media.service.signing';
import { getBucketBaseUrl, hasStorageConfig, resolveAssetUrl } from './media.service.storage';

export async function createSigningProbe(config: MediaStorageConfig): Promise<MediaSigningProbeResult> {
  const startedAt = new Date().toISOString();

  if (config.provider === 'local-filesystem') {
    return {
      startedAt,
      completedAt: new Date().toISOString(),
      configured: true,
      uploadUrlGenerated: false,
      objectKey: null,
      assetUrl: null,
      expiresAt: null,
      bucketBaseUrl: config.localMediaRoot,
      bucketReachable: true,
      bucketStatusCode: null,
      message: 'Local filesystem media storage is active. Signed upload probing is only available for the DigitalOcean Spaces provider.',
    };
  }

  if (!hasStorageConfig(config)) {
    return {
      startedAt,
      completedAt: new Date().toISOString(),
      configured: false,
      uploadUrlGenerated: false,
      objectKey: null,
      assetUrl: null,
      expiresAt: null,
      bucketBaseUrl: config.bucket && config.endpoint ? getBucketBaseUrl(config) : null,
      bucketReachable: null,
      bucketStatusCode: null,
      message: 'DigitalOcean Spaces is not configured.',
    };
  }

  const objectKey = `bakki/probe/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.txt`;
  const signed = createSignedPutUrl(config, objectKey);
  const bucketReachability = await probeBucketReachability(config);

  return {
    startedAt,
    completedAt: new Date().toISOString(),
    configured: true,
    uploadUrlGenerated: Boolean(signed.uploadUrl),
    objectKey,
    assetUrl: resolveAssetUrl(config, objectKey),
    expiresAt: signed.expiresAt,
    bucketBaseUrl: getBucketBaseUrl(config),
    bucketReachable: bucketReachability.reachable,
    bucketStatusCode: bucketReachability.statusCode,
    message: bucketReachability.message,
  };
}

export async function createUploadProbe(config: MediaStorageConfig): Promise<MediaUploadProbeResult> {
  const startedAt = new Date().toISOString();

  if (config.provider === 'local-filesystem') {
    return {
      startedAt,
      completedAt: new Date().toISOString(),
      configured: true,
      objectKey: null,
      uploadStatusCode: null,
      uploaded: false,
      headStatusCode: null,
      verifiedReadable: null,
      cleanupSucceeded: null,
      message: 'Local filesystem media storage is active. Direct upload probing is only available for the DigitalOcean Spaces provider.',
    };
  }

  if (!hasStorageConfig(config)) {
    return {
      startedAt,
      completedAt: new Date().toISOString(),
      configured: false,
      objectKey: null,
      uploadStatusCode: null,
      uploaded: false,
      headStatusCode: null,
      verifiedReadable: null,
      cleanupSucceeded: null,
      message: 'DigitalOcean Spaces is not configured.',
    };
  }

  const objectKey = `bakki/probe/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.txt`;
  const putSigned = createSignedObjectUrl(config, 'PUT', objectKey);
  const headSigned = createSignedObjectUrl(config, 'HEAD', objectKey);
  const deleteSigned = createSignedObjectUrl(config, 'DELETE', objectKey);

  let uploadStatusCode: number | null = null;
  let uploaded = false;
  let headStatusCode: number | null = null;
  let verifiedReadable: boolean | null = null;
  let cleanupSucceeded: boolean | null = null;

  try {
    const uploadResponse = await fetch(putSigned.url, {
      method: 'PUT',
      headers: {
        ...putSigned.requiredHeaders,
        'Content-Type': 'text/plain; charset=utf-8',
      },
      body: `bakki upload probe ${startedAt}\n`,
    });
    uploadStatusCode = uploadResponse.status;
    uploaded = uploadResponse.ok;

    if (!uploadResponse.ok) {
      return {
        startedAt,
        completedAt: new Date().toISOString(),
        configured: true,
        objectKey,
        uploadStatusCode,
        uploaded: false,
        headStatusCode: null,
        verifiedReadable: null,
        cleanupSucceeded: null,
        message: `Upload probe failed with status ${uploadResponse.status}.`,
      };
    }

    const headResponse = await fetch(headSigned.url, {
      method: 'HEAD',
      headers: headSigned.requiredHeaders,
    });
    headStatusCode = headResponse.status;
    verifiedReadable = headResponse.ok;

    const deleteResponse = await fetch(deleteSigned.url, {
      method: 'DELETE',
      headers: deleteSigned.requiredHeaders,
    });
    cleanupSucceeded = deleteResponse.ok;

    return {
      startedAt,
      completedAt: new Date().toISOString(),
      configured: true,
      objectKey,
      uploadStatusCode,
      uploaded,
      headStatusCode,
      verifiedReadable,
      cleanupSucceeded,
      message:
        uploaded && verifiedReadable
          ? cleanupSucceeded
            ? 'Spaces upload probe succeeded and the probe object was cleaned up.'
            : 'Spaces upload probe succeeded, but cleanup failed.'
          : 'Spaces upload probe completed with verification issues.',
    };
  } catch (error) {
    return {
      startedAt,
      completedAt: new Date().toISOString(),
      configured: true,
      objectKey,
      uploadStatusCode,
      uploaded,
      headStatusCode,
      verifiedReadable,
      cleanupSucceeded,
      message: error instanceof Error ? `Spaces upload probe failed: ${error.message}` : 'Spaces upload probe failed.',
    };
  }
}
