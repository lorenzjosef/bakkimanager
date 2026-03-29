create table if not exists bakki_species (
  species_ref text primary key,
  common_name text not null,
  botanical_name text not null,
  inventory_unit text not null default 'trees',
  quantity_on_hand integer not null default 0,
  total_planted integer not null default 0,
  growth_phase_label text,
  area_type_label text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bakki_species_common_name_idx
on bakki_species (lower(common_name));

create table if not exists bakki_inventory_transaction (
  id bigserial primary key,
  species_ref text not null references bakki_species(species_ref) on delete restrict,
  quantity_delta integer not null,
  quantity_after integer not null,
  reason text not null check (reason in ('adjustment', 'correction', 'planting', 'monitoring', 'fertilizing')),
  note text,
  phase_ref text,
  task_ref text,
  occurred_at timestamptz not null default now()
);

create index if not exists bakki_inventory_transaction_species_ref_idx
on bakki_inventory_transaction (species_ref, occurred_at desc);
