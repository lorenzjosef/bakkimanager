create table if not exists bakki_task_template (
  template_ref text primary key,
  task_type text not null check (task_type in ('planting', 'monitoring', 'fertilizing')),
  label text not null,
  description text not null,
  youtube_url text,
  checklist_item_count integer not null default 0,
  default_priority integer not null default 2,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bakki_task_template_task_type_idx
on bakki_task_template (task_type);

insert into bakki_task_template (
  template_ref,
  task_type,
  label,
  description,
  youtube_url,
  checklist_item_count,
  default_priority,
  active
)
values
  (
    'template-planting-default',
    'planting',
    'Planting',
    'Deploy saplings into the assigned contract area and record planting progress against the contract goal.',
    null,
    4,
    3,
    true
  ),
  (
    'template-monitoring-default',
    'monitoring',
    'Monitoring',
    'Inspect the assigned area, measure live density, and update the latest tree count when available.',
    null,
    3,
    2,
    true
  ),
  (
    'template-fertilizing-default',
    'fertilizing',
    'Fertilizing',
    'Apply the planned nutrient treatment and confirm the treated contract area segment.',
    null,
    3,
    2,
    true
  )
on conflict (template_ref) do update set
  task_type = excluded.task_type,
  label = excluded.label,
  description = excluded.description,
  youtube_url = excluded.youtube_url,
  checklist_item_count = excluded.checklist_item_count,
  default_priority = excluded.default_priority,
  active = excluded.active,
  updated_at = now();

alter table bakki_task
add column if not exists template_ref text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bakki_task_template_ref_fkey'
  ) then
    alter table bakki_task
    add constraint bakki_task_template_ref_fkey
    foreign key (template_ref) references bakki_task_template(template_ref) on delete set null;
  end if;
end
$$;
