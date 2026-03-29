import { createHash, createHmac } from 'node:crypto';
import type { MediaStorageConfig } from './media.service.storage';
import { getBucketBaseUrl, getBucketHost } from './media.service.storage';

type SignedObjectMethod = 'DELETE' | 'HEAD' | 'PUT';

export function createSignedPutUrl(config: MediaStorageConfig, objectKey: string) {
  const signed = createSignedObjectUrl(config, 'PUT', objectKey);
  return {
    uploadUrl: signed.url,
    requiredHeaders: signed.requiredHeaders,
    expiresAt: signed.expiresAt,
  };
}

export function createSignedObjectUrl(
  config: MediaStorageConfig,
  method: SignedObjectMethod,
  objectKey: string,
) {
  const now = new Date();
  const amzDate = formatAmzDate(now);
  const shortDate = amzDate.slice(0, 8);
  const host = getBucketHost(config);
  const canonicalUri = `/${encodeObjectKey(objectKey)}`;
  const credentialScope = `${shortDate}/${config.region}/s3/aws4_request`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const queryParams = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${config.accessKey}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(config.signedUploadTtlSeconds),
    'X-Amz-SignedHeaders': signedHeaders,
  });

  const canonicalRequest = [
    method,
    canonicalUri,
    buildCanonicalQueryString(queryParams),
    `host:${host}\n` + 'x-amz-content-sha256:UNSIGNED-PAYLOAD\n' + `x-amz-date:${amzDate}\n`,
    signedHeaders,
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const canonicalRequestHash = sha256Hex(canonicalRequest);
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    canonicalRequestHash,
  ].join('\n');

  const signingKey = deriveSigningKey(config, shortDate);
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');
  queryParams.set('X-Amz-Signature', signature);

  return {
    url: `${getBucketBaseUrl(config)}${canonicalUri}?${queryParams.toString()}`,
    requiredHeaders: {
      'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
      'x-amz-date': amzDate,
    },
    expiresAt: new Date(now.getTime() + config.signedUploadTtlSeconds * 1000).toISOString(),
  };
}

export async function probeBucketReachability(config: MediaStorageConfig) {
  try {
    const response = await fetch(getBucketBaseUrl(config), {
      method: 'HEAD',
    });
    const reachable = response.status >= 200 && response.status < 500;
    return {
      reachable,
      statusCode: response.status,
      message: reachable
        ? `Spaces endpoint responded with status ${response.status}.`
        : `Spaces endpoint returned status ${response.status}.`,
    };
  } catch (error) {
    return {
      reachable: false,
      statusCode: null,
      message: error instanceof Error
        ? `Spaces reachability probe failed: ${error.message}`
        : 'Spaces reachability probe failed.',
    };
  }
}

function buildCanonicalQueryString(params: URLSearchParams) {
  return [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

function formatAmzDate(date: Date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function deriveSigningKey(config: MediaStorageConfig, shortDate: string) {
  const kDate = createHmac('sha256', `AWS4${config.secretKey}`).update(shortDate).digest();
  const kRegion = createHmac('sha256', kDate).update(config.region).digest();
  const kService = createHmac('sha256', kRegion).update('s3').digest();
  return createHmac('sha256', kService).update('aws4_request').digest();
}

function sha256Hex(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function encodeObjectKey(objectKey: string) {
  return objectKey
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}
