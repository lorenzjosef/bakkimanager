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

drop trigger if exists bakki_ranch_geometry_derived_fields on bakki_ranch;
create trigger bakki_ranch_geometry_derived_fields
before insert or update on bakki_ranch
for each row
execute function bakki_sync_geometry_derived_fields();

drop trigger if exists bakki_zone_geometry_derived_fields on bakki_zone;
create trigger bakki_zone_geometry_derived_fields
before insert or update on bakki_zone
for each row
execute function bakki_sync_geometry_derived_fields();

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

update bakki_ranch
set
  bbox = ST_Envelope(boundary_geometry),
  area_hectares_estimate = round((ST_Area(boundary_geometry::geography) / 10000.0)::numeric, 2);

update bakki_zone
set
  bbox = ST_Envelope(boundary_geometry),
  area_hectares_estimate = round((ST_Area(boundary_geometry::geography) / 10000.0)::numeric, 2);

update bakki_area
set
  bbox = ST_Envelope(boundary_geometry),
  area_hectares_estimate = round((ST_Area(boundary_geometry::geography) / 10000.0)::numeric, 2);
