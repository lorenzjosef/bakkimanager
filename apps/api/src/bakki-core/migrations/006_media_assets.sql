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
);

create index if not exists bakki_task_photo_task_ref_idx
on bakki_task_photo (task_ref, created_at desc);

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
);

create index if not exists bakki_observation_photo_observation_ref_idx
on bakki_observation_photo (observation_ref, created_at desc);
