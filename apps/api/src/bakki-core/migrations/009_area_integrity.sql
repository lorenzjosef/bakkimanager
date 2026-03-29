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
  return NEW;
end;
$$;

drop trigger if exists bakki_area_geometry_validation on bakki_area;

create trigger bakki_area_geometry_validation
before insert or update on bakki_area
for each row
execute function bakki_validate_area_geometry();

create unique index if not exists bakki_phase_area_contract_unique_area_idx
on bakki_phase_area_contract (phase_id, area_ref);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bakki_task_area_ref_fkey'
  ) then
    alter table bakki_task
    add constraint bakki_task_area_ref_fkey
    foreign key (area_ref) references bakki_area(area_ref) on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'bakki_phase_area_contract_area_ref_fkey'
  ) then
    alter table bakki_phase_area_contract
    add constraint bakki_phase_area_contract_area_ref_fkey
    foreign key (area_ref) references bakki_area(area_ref) on delete restrict;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'bakki_area_metrics_area_ref_fkey'
  ) then
    alter table bakki_area_metrics
    add constraint bakki_area_metrics_area_ref_fkey
    foreign key (area_ref) references bakki_area(area_ref) on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'bakki_area_observation_area_ref_fkey'
  ) then
    alter table bakki_area_observation
    add constraint bakki_area_observation_area_ref_fkey
    foreign key (area_ref) references bakki_area(area_ref) on delete cascade;
  end if;
end
$$;
