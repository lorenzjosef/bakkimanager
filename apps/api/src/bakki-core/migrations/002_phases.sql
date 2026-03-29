create table if not exists bakki_phase (
  id bigserial primary key,
  phase_name text not null,
  start_date date not null,
  end_date date not null,
  description text not null default '',
  state text not null check (state in ('draft', 'active', 'done', 'cancelled')),
  field_lead_user_id bigint references bakki_user(id) on delete set null,
  crew_rotation text,
  operational_notes text,
  default_task_type text not null check (default_task_type in ('planting', 'monitoring', 'fertilizing')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bakki_phase_state_idx
on bakki_phase (state);

create index if not exists bakki_phase_start_date_idx
on bakki_phase (start_date desc);

create table if not exists bakki_phase_participant (
  phase_id bigint not null references bakki_phase(id) on delete cascade,
  bakki_user_id bigint not null references bakki_user(id) on delete restrict,
  state text not null default 'active' check (state in ('active', 'removed')),
  created_at timestamptz not null default now(),
  primary key (phase_id, bakki_user_id)
);

create index if not exists bakki_phase_participant_user_idx
on bakki_phase_participant (bakki_user_id);

create table if not exists bakki_phase_area_contract (
  id bigserial primary key,
  phase_id bigint not null references bakki_phase(id) on delete cascade,
  area_ref text not null,
  assigned_user_id bigint not null references bakki_user(id) on delete restrict,
  species_ref text,
  species_name text,
  tray_count integer,
  trees_per_tray integer,
  contract_tree_goal integer,
  target_density_per_100sqm numeric,
  sequence integer not null default 10,
  created_at timestamptz not null default now()
);

create index if not exists bakki_phase_area_contract_phase_idx
on bakki_phase_area_contract (phase_id, sequence);

create index if not exists bakki_phase_area_contract_user_idx
on bakki_phase_area_contract (assigned_user_id);
