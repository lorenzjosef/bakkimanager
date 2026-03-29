create table if not exists bakki_area_metrics (
  area_ref text primary key,
  zone_ref text,
  area_name text not null,
  current_density_per_100sqm numeric not null,
  current_tree_count integer,
  updated_at timestamptz not null default now()
);

create index if not exists bakki_area_metrics_zone_ref_idx
on bakki_area_metrics (zone_ref);

create table if not exists bakki_area_observation (
  id bigserial primary key,
  area_ref text not null references bakki_area_metrics(area_ref) on delete cascade,
  task_ref text,
  actor_user_id bigint references bakki_user(id) on delete set null,
  measured_density_per_100sqm numeric not null,
  measured_tree_count integer,
  notes text,
  observed_at timestamptz not null default now()
);

create index if not exists bakki_area_observation_area_ref_idx
on bakki_area_observation (area_ref, observed_at desc);
