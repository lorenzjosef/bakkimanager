import { Injectable } from '@nestjs/common';
import type { MediaAssetRecord } from '@bakki/domain';
import { BakkiCoreService } from './bakki-core.service';
import { requireFirstRow } from './query-result.utils';
import { ensureSchemaInitialized } from './schema-init.utils';

export interface CreateBakkiMediaAssetInput {
  assetUrl: string | null;
  caption?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  name: string;
  objectKey: string | null;
  ownerId: number | null;
  ownerRef: string;
  ownerType: 'observation' | 'task';
  storageBucket?: string | null;
  storageProvider?: string | null;
}

@Injectable()
export class BakkiMediaAssetService {
  private schemaEnsured = false;
  private schemaInitPromise: Promise<void> | null = null;

  constructor(private readonly bakkiCore: BakkiCoreService) {}

  isConfigured() {
    return this.bakkiCore.isConfigured();
  }

  async listTaskPhotos(taskRef: string) {
    await this.ensureSchema();
    const result = await this.bakkiCore.query<BakkiMediaRow>(
      `
        select
          id,
          task_ref as owner_ref,
          task_owner_id as owner_id,
          name,
          file_name,
          mime_type,
          caption,
          object_key,
          asset_url,
          created_at
        from bakki_task_photo
        where task_ref = $1
        order by created_at desc, id desc
      `,
      [taskRef],
    );

    return result.rows.map((row) => mapRow('task', row));
  }

  async listObservationPhotos(observationRef: string) {
    await this.ensureSchema();
    const result = await this.bakkiCore.query<BakkiMediaRow>(
      `
        select
          id,
          observation_ref as owner_ref,
          observation_owner_id as owner_id,
          name,
          file_name,
          mime_type,
          caption,
          object_key,
          asset_url,
          created_at
        from bakki_observation_photo
        where observation_ref = $1
        order by created_at desc, id desc
      `,
      [observationRef],
    );

    return result.rows.map((row) => mapRow('observation', row));
  }

  async create(input: CreateBakkiMediaAssetInput) {
    await this.ensureSchema();

    if (input.ownerType === 'task') {
      const result = await this.bakkiCore.query<BakkiMediaRow>(
        `
          insert into bakki_task_photo (
            task_ref,
            task_owner_id,
            name,
            file_name,
            mime_type,
            caption,
            object_key,
            storage_provider,
            storage_bucket,
            asset_url
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          returning
            id,
            task_ref as owner_ref,
            task_owner_id as owner_id,
            name,
            file_name,
            mime_type,
            caption,
            object_key,
            asset_url,
            created_at
        `,
        [
          input.ownerRef,
          input.ownerId,
          input.name,
          input.fileName ?? null,
          input.mimeType ?? null,
          input.caption ?? null,
          input.objectKey,
          input.storageProvider ?? null,
          input.storageBucket ?? null,
          input.assetUrl,
        ],
      );

      return mapRow('task', requireFirstRow(result.rows, 'Failed to insert Bakki media asset.'));
    }

    const result = await this.bakkiCore.query<BakkiMediaRow>(
      `
        insert into bakki_observation_photo (
          observation_ref,
          observation_owner_id,
          name,
          file_name,
          mime_type,
          caption,
          object_key,
          storage_provider,
          storage_bucket,
          asset_url
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        returning
          id,
          observation_ref as owner_ref,
          observation_owner_id as owner_id,
          name,
          file_name,
          mime_type,
          caption,
          object_key,
          asset_url,
          created_at
      `,
      [
        input.ownerRef,
        input.ownerId,
        input.name,
        input.fileName ?? null,
        input.mimeType ?? null,
        input.caption ?? null,
        input.objectKey,
        input.storageProvider ?? null,
        input.storageBucket ?? null,
        input.assetUrl,
      ],
    );

    return mapRow('observation', requireFirstRow(result.rows, 'Failed to insert Bakki media asset.'));
  }

  private async ensureSchema() {
    await ensureSchemaInitialized({
      getSchemaInitPromise: () => this.schemaInitPromise,
      initialize: () => this.ensureSchemaInternal(),
      isConfigured: this.bakkiCore.isConfigured(),
      schemaEnsured: this.schemaEnsured,
      setSchemaInitPromise: (promise) => {
        this.schemaInitPromise = promise;
      },
    });
  }

  private async ensureSchemaInternal() {
    await this.bakkiCore.query(`
      create table if not exists bakki_task_photo (
        id bigserial primary key,
        task_ref text not null,
        task_owner_id bigint,
        name text not null,
        file_name text,
        mime_type text,
        caption text,
        object_key text,
        storage_provider text,
        storage_bucket text,
        asset_url text,
        created_at timestamptz not null default now()
      )
    `);

    await this.bakkiCore.query(`
      create table if not exists bakki_observation_photo (
        id bigserial primary key,
        observation_ref text not null,
        observation_owner_id bigint,
        name text not null,
        file_name text,
        mime_type text,
        caption text,
        object_key text,
        storage_provider text,
        storage_bucket text,
        asset_url text,
        created_at timestamptz not null default now()
      )
    `);

    await this.bakkiCore.query(`
      create index if not exists bakki_task_photo_task_ref_idx
      on bakki_task_photo (task_ref, created_at desc)
    `);
    await this.bakkiCore.query(`
      create index if not exists bakki_observation_photo_observation_ref_idx
      on bakki_observation_photo (observation_ref, created_at desc)
    `);

    this.schemaEnsured = true;
  }
}

interface BakkiMediaRow {
  asset_url: string | null;
  caption: string | null;
  created_at: Date | string;
  file_name: string | null;
  id: number | string;
  mime_type: string | null;
  name: string;
  object_key: string | null;
  owner_id: number | null;
  owner_ref: string;
}

function mapRow(ownerType: 'observation' | 'task', row: BakkiMediaRow): MediaAssetRecord {
  return {
    id: `${ownerType}-photo-${row.id}`,
    ownerType,
    ownerId:
      row.owner_id === null
        ? parseNumericRef(row.owner_ref) ?? 0
        : Number(row.owner_id),
    name: row.name,
    fileName: row.file_name,
    mimeType: row.mime_type,
    caption: row.caption,
    objectKey: row.object_key,
    assetUrl: row.asset_url,
  };
}

function parseNumericRef(value: string) {
  const match = value.match(/(\d+)$/)?.[1];
  return match ? Number(match) : null;
}
