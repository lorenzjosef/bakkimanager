create extension if not exists postgis;

create table if not exists bakki_ranch (
  ranch_ref text primary key,
  ranch_code text not null unique,
  name text not null,
  source_file_name text not null,
  source_feature_name text not null,
  boundary_geometry geometry(MultiPolygon, 4326) not null,
  bbox geometry(Polygon, 4326),
  area_hectares_estimate numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bakki_ranch_boundary_geometry_gix
on bakki_ranch using gist (boundary_geometry);

create table if not exists bakki_zone (
  zone_ref text primary key,
  ranch_ref text not null references bakki_ranch(ranch_ref) on delete cascade,
  zone_code text not null unique,
  name text not null,
  status_label text not null default 'Mapped',
  prototype_interactive boolean not null default false,
  sort_order integer not null default 10,
  boundary_geometry geometry(MultiPolygon, 4326) not null,
  bbox geometry(Polygon, 4326),
  area_hectares_estimate numeric,
  source_file_name text not null,
  source_feature_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bakki_zone_ranch_ref_idx
on bakki_zone (ranch_ref);

create index if not exists bakki_zone_boundary_geometry_gix
on bakki_zone using gist (boundary_geometry);

create table if not exists bakki_area (
  area_ref text primary key,
  zone_ref text not null references bakki_zone(zone_ref) on delete cascade,
  name text not null,
  boundary_geometry geometry(MultiPolygon, 4326) not null,
  bbox geometry(Polygon, 4326),
  area_hectares_estimate numeric,
  source_file_name text,
  source_feature_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bakki_area_zone_ref_idx
on bakki_area (zone_ref);

create index if not exists bakki_area_boundary_geometry_gix
on bakki_area using gist (boundary_geometry);
