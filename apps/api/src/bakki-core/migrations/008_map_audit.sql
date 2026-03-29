create table if not exists bakki_map_audit (
  id bigserial primary key,
  ranch_ref text not null,
  editor_user_id bigint references bakki_user(id) on delete set null,
  entity_type text not null,
  entity_ref text not null,
  change_type text not null,
  change_summary text not null,
  diff_payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists bakki_map_audit_created_at_idx
on bakki_map_audit (created_at desc);

create index if not exists bakki_map_audit_entity_idx
on bakki_map_audit (entity_type, entity_ref);
