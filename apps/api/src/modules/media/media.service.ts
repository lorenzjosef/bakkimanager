import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  CreateMediaUploadIntentRequest,
  FinalizeMediaUploadRequest,
  FinalizeMediaUploadResponse,
  MediaAssetRecord,
  MediaUploadIntentResponse,
} from '@bakki/domain';
import { BakkiMediaAssetService } from '../../bakki-core/bakki-media-asset.service';
import { createSigningProbe, createUploadProbe } from './media.service.probes';
import { createSignedPutUrl } from './media.service.signing';
import {
  buildFallbackPhotoRecord,
  buildObjectKey,
  buildOwnerRef,
  buildUploadStatus,
  createMediaStorageConfig,
  ensureExpectedObjectKey,
  hasStorageConfig,
  normalizeObjectKey,
  parseRequiredOwnerId,
  resolveAssetUrl,
  type MediaOwnerType,
} from './media.service.storage';

@Injectable()
export class MediaService {
  private readonly storage = createMediaStorageConfig();

  constructor(private readonly bakkiMediaAssets: BakkiMediaAssetService) {}

  getUploadStatus() {
    return buildUploadStatus(this.storage);
  }

  async listTaskPhotos(taskId: string): Promise<MediaAssetRecord[]> {
    if (!this.bakkiMediaAssets.isConfigured()) {
      return [];
    }

    return this.bakkiMediaAssets.listTaskPhotos(taskId);
  }

  async listObservationPhotos(observationId: string): Promise<MediaAssetRecord[]> {
    if (!this.bakkiMediaAssets.isConfigured()) {
      return [];
    }

    return this.bakkiMediaAssets.listObservationPhotos(observationId);
  }

  async createTaskUploadIntent(
    taskId: string,
    input: CreateMediaUploadIntentRequest,
  ): Promise<MediaUploadIntentResponse> {
    const numericTaskId = parseRequiredOwnerId(taskId, 'task');
    return this.createUploadIntent('task', numericTaskId, input);
  }

  async createObservationUploadIntent(
    observationId: string,
    input: CreateMediaUploadIntentRequest,
  ): Promise<MediaUploadIntentResponse> {
    const numericObservationId = parseRequiredOwnerId(observationId, 'observation');
    return this.createUploadIntent('observation', numericObservationId, input);
  }

  async finalizeTaskUpload(
    taskId: string,
    input: FinalizeMediaUploadRequest,
  ): Promise<FinalizeMediaUploadResponse> {
    const numericTaskId = parseRequiredOwnerId(taskId, 'task');
    return this.finalizeUpload('task', numericTaskId, input);
  }

  async finalizeObservationUpload(
    observationId: string,
    input: FinalizeMediaUploadRequest,
  ): Promise<FinalizeMediaUploadResponse> {
    const numericObservationId = parseRequiredOwnerId(observationId, 'observation');
    return this.finalizeUpload('observation', numericObservationId, input);
  }

  async createSigningProbe() {
    return createSigningProbe(this.storage);
  }

  async createUploadProbe() {
    return createUploadProbe(this.storage);
  }

  private async createUploadIntent(
    ownerType: MediaOwnerType,
    ownerId: number,
    input: CreateMediaUploadIntentRequest,
  ): Promise<MediaUploadIntentResponse> {
    if (this.storage.provider === 'local-filesystem') {
      throw new BadRequestException(
        'Local filesystem media storage does not support signed direct uploads. Use DigitalOcean Spaces for upload signing.',
      );
    }

    if (!hasStorageConfig(this.storage)) {
      throw new BadRequestException('DigitalOcean Spaces is not configured.');
    }

    if (input.fileSizeBytes > this.storage.maxUploadBytes) {
      throw new BadRequestException(`Uploads are limited to ${this.storage.maxUploadBytes} bytes.`);
    }

    const objectKey = buildObjectKey(ownerType, ownerId, input.fileName);
    const signed = createSignedPutUrl(this.storage, objectKey);

    return {
      ownerType,
      ownerId,
      objectKey,
      assetUrl: resolveAssetUrl(this.storage, objectKey),
      uploadUrl: signed.uploadUrl,
      method: 'PUT',
      requiredHeaders: {
        'Content-Type': input.mimeType,
        ...signed.requiredHeaders,
      },
      expiresAt: signed.expiresAt,
      maxFileSizeBytes: this.storage.maxUploadBytes,
    };
  }

  private async finalizeUpload(
    ownerType: MediaOwnerType,
    ownerId: number,
    input: FinalizeMediaUploadRequest,
  ): Promise<FinalizeMediaUploadResponse> {
    const normalizedObjectKey = normalizeObjectKey(input.objectKey);
    ensureExpectedObjectKey(ownerType, ownerId, normalizedObjectKey);

    const fallbackRecord = buildFallbackPhotoRecord(
      this.storage,
      ownerType,
      ownerId,
      input,
      normalizedObjectKey,
    );

    if (!this.bakkiMediaAssets.isConfigured()) {
      return { photo: fallbackRecord };
    }

    const photo = await this.bakkiMediaAssets.create({
      ownerType,
      ownerId,
      ownerRef: buildOwnerRef(ownerType, ownerId),
      name: input.displayName || input.fileName,
      fileName: input.fileName,
      mimeType: input.mimeType,
      caption: input.caption || null,
      objectKey: normalizedObjectKey,
      storageProvider: this.storage.provider,
      storageBucket: this.storage.bucket || null,
      assetUrl: input.assetUrl || resolveAssetUrl(this.storage, normalizedObjectKey),
    });

    return { photo };
  }
}
