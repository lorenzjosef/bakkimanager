create table if not exists bakki_audit_log (
  id bigserial primary key,
  actor text not null,
  actor_user_id bigint references bakki_user(id) on delete set null,
  event_type text not null,
  target_model text,
  target_res_id bigint,
  message text not null,
  payload_json jsonb,
  ip_address text,
  occurred_at timestamptz not null default now()
);

create index if not exists bakki_audit_log_occurred_at_idx
on bakki_audit_log (occurred_at desc);

create index if not exists bakki_audit_log_event_type_idx
on bakki_audit_log (event_type);

create index if not exists bakki_audit_log_actor_user_idx
on bakki_audit_log (actor_user_id);
