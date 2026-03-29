alter table if exists bakki_user
  add column if not exists sync_status text not null default 'ok';

alter table if exists bakki_user
  add column if not exists sync_error text;

alter table if exists bakki_user
  add column if not exists sync_retry_count integer not null default 0;

alter table if exists bakki_user
  add column if not exists last_sync_attempt_at timestamptz not null default now();

update bakki_user
set sync_status = coalesce(sync_status, 'ok'),
    sync_retry_count = coalesce(sync_retry_count, 0),
    last_sync_attempt_at = coalesce(last_sync_attempt_at, last_synced_at, now());

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bakki_user_sync_status_check'
  ) then
    alter table bakki_user
      add constraint bakki_user_sync_status_check
      check (sync_status in ('ok', 'error'));
  end if;
end
$$;

create index if not exists bakki_user_sync_status_idx
on bakki_user (sync_status);

alter table if exists bakki_task
  add column if not exists sync_status text not null default 'ok';

alter table if exists bakki_task
  add column if not exists sync_error text;

alter table if exists bakki_task
  add column if not exists sync_retry_count integer not null default 0;

alter table if exists bakki_task
  add column if not exists last_sync_attempt_at timestamptz not null default now();

update bakki_task
set sync_status = coalesce(sync_status, 'ok'),
    sync_retry_count = coalesce(sync_retry_count, 0),
    last_sync_attempt_at = coalesce(last_sync_attempt_at, last_synced_at, now());

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bakki_task_sync_status_check'
  ) then
    alter table bakki_task
      add constraint bakki_task_sync_status_check
      check (sync_status in ('ok', 'error'));
  end if;
end
$$;

create index if not exists bakki_task_sync_status_idx
on bakki_task (sync_status);
