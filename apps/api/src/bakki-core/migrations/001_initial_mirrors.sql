create table if not exists bakki_user (
  id bigserial primary key,
  odoo_user_id bigint not null unique,
  login text not null,
  display_name text not null,
  role text not null check (role in ('owner', 'planter')),
  active boolean not null default true,
  mobile_access_enabled boolean not null default true,
  last_synced_at timestamptz not null default now()
);

create unique index if not exists bakki_user_odoo_user_id_idx
on bakki_user (odoo_user_id);

create unique index if not exists bakki_user_login_idx
on bakki_user (lower(login));

create table if not exists bakki_task (
  id bigserial primary key,
  odoo_task_id bigint not null unique,
  title text not null,
  workflow_state text not null check (workflow_state in ('pending', 'in_progress', 'done', 'cancelled')),
  odoo_stage_id bigint,
  odoo_stage_name text,
  due_at timestamptz,
  task_type text,
  area_ref text,
  phase_ref text,
  monitoring_density_per_100sqm numeric,
  monitoring_tree_count integer,
  last_synced_at timestamptz not null default now()
);

create unique index if not exists bakki_task_odoo_task_id_idx
on bakki_task (odoo_task_id);

create index if not exists bakki_task_workflow_state_idx
on bakki_task (workflow_state);

create index if not exists bakki_task_due_at_idx
on bakki_task (due_at);
