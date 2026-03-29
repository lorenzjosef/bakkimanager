interface GeometryQueryable {
  query: (text: string, params?: unknown[]) => Promise<unknown>;
}

export async function ensureBakkiGeometrySchema(options: {
  bakkiCore: GeometryQueryable;
}) {
  await options.bakkiCore.query('create extension if not exists postgis');

  await options.bakkiCore.query(`
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
    )
  `);

  await options.bakkiCore.query(`
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
    )
  `);

  await options.bakkiCore.query(`
    create table if not exists bakki_area (
      area_ref text primary key,
      zone_ref text not null references bakki_zone(zone_ref) on delete cascade,
      name text not null,
      assigned_species_ref text,
      boundary_geometry geometry(MultiPolygon, 4326) not null,
      bbox geometry(Polygon, 4326),
      area_hectares_estimate numeric,
      source_file_name text,
      source_feature_name text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);

  await options.bakkiCore.query(`
    create index if not exists bakki_ranch_boundary_geometry_gix
    on bakki_ranch using gist (boundary_geometry)
  `);
  await options.bakkiCore.query(`
    create index if not exists bakki_zone_ranch_ref_idx
    on bakki_zone (ranch_ref)
  `);
  await options.bakkiCore.query(`
    create index if not exists bakki_zone_boundary_geometry_gix
    on bakki_zone using gist (boundary_geometry)
  `);
  await options.bakkiCore.query(`
    create index if not exists bakki_area_zone_ref_idx
    on bakki_area (zone_ref)
  `);
  await options.bakkiCore.query(`
    create index if not exists bakki_area_boundary_geometry_gix
    on bakki_area using gist (boundary_geometry)
  `);
  await options.bakkiCore.query(`
    alter table bakki_area
    add column if not exists assigned_species_ref text
  `);

  await options.bakkiCore.query(`
    create or replace function bakki_sync_geometry_derived_fields()
    returns trigger
    language plpgsql
    as $$
    begin
      if NEW.boundary_geometry is null then
        raise exception 'Geometry is required.';
      end if;

      NEW.boundary_geometry := ST_Multi(ST_CollectionExtract(NEW.boundary_geometry, 3));

      if not ST_IsValid(NEW.boundary_geometry) then
        raise exception 'Geometry is invalid.';
      end if;

      NEW.bbox := ST_Envelope(NEW.boundary_geometry);
      NEW.area_hectares_estimate := round((ST_Area(NEW.boundary_geometry::geography) / 10000.0)::numeric, 2);
      return NEW;
    end;
    $$;
  `);
  await options.bakkiCore.query(`
    drop trigger if exists bakki_ranch_geometry_derived_fields on bakki_ranch
  `);
  await options.bakkiCore.query(`
    create trigger bakki_ranch_geometry_derived_fields
    before insert or update on bakki_ranch
    for each row
    execute function bakki_sync_geometry_derived_fields()
  `);
  await options.bakkiCore.query(`
    drop trigger if exists bakki_zone_geometry_derived_fields on bakki_zone
  `);
  await options.bakkiCore.query(`
    create trigger bakki_zone_geometry_derived_fields
    before insert or update on bakki_zone
    for each row
    execute function bakki_sync_geometry_derived_fields()
  `);

  await options.bakkiCore.query(`
    create or replace function bakki_validate_area_geometry()
    returns trigger
    language plpgsql
    as $$
    declare
      parent_zone geometry;
    begin
      if NEW.boundary_geometry is null then
        raise exception 'Area geometry is required.';
      end if;

      NEW.boundary_geometry := ST_Multi(ST_CollectionExtract(NEW.boundary_geometry, 3));

      if not ST_IsValid(NEW.boundary_geometry) then
        raise exception 'Area geometry is invalid.';
      end if;

      select boundary_geometry
      into parent_zone
      from bakki_zone
      where zone_ref = NEW.zone_ref;

      if parent_zone is null then
        raise exception 'Parent zone % does not exist for area %.', NEW.zone_ref, NEW.area_ref;
      end if;

      if not ST_CoveredBy(NEW.boundary_geometry, parent_zone) then
        raise exception 'Area % must stay fully within zone %.', NEW.area_ref, NEW.zone_ref;
      end if;

      if exists (
        select 1
        from bakki_area sibling
        where sibling.zone_ref = NEW.zone_ref
          and sibling.area_ref <> NEW.area_ref
          and ST_Intersects(NEW.boundary_geometry, sibling.boundary_geometry)
          and not ST_Touches(NEW.boundary_geometry, sibling.boundary_geometry)
      ) then
        raise exception 'Area % overlaps another area in zone %.', NEW.area_ref, NEW.zone_ref;
      end if;

      NEW.bbox := ST_Envelope(NEW.boundary_geometry);
      NEW.area_hectares_estimate := round((ST_Area(NEW.boundary_geometry::geography) / 10000.0)::numeric, 2);
      return NEW;
    end;
    $$;
  `);
  await options.bakkiCore.query(`
    drop trigger if exists bakki_area_geometry_validation on bakki_area
  `);
  await options.bakkiCore.query(`
    create trigger bakki_area_geometry_validation
    before insert or update on bakki_area
    for each row
    execute function bakki_validate_area_geometry()
  `);
}
