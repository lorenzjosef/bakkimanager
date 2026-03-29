import {
  buildBboxPolygonWkt,
  deriveZoneRef,
  type GeometrySeedDocument,
} from './bakki-geometry.helpers';

interface GeometryQueryable {
  query: (text: string, params?: unknown[]) => Promise<unknown>;
}

export async function promoteBakkiGeometrySeed(options: {
  bakkiCore: GeometryQueryable;
  seed: GeometrySeedDocument;
}) {
  const ranch = options.seed.ranch;
  const ranchRef = 'ranch-main';

  await options.bakkiCore.query(
    `
      insert into bakki_ranch (
        ranch_ref,
        ranch_code,
        name,
        source_file_name,
        source_feature_name,
        boundary_geometry,
        bbox,
        area_hectares_estimate,
        updated_at
      )
      values (
        $1,
        $2,
        $3,
        $4,
        $5,
        ST_Multi(ST_GeomFromText($6, 4326)),
        ST_GeomFromText($7, 4326),
        $8,
        now()
      )
      on conflict (ranch_ref)
      do update set
        ranch_code = excluded.ranch_code,
        name = excluded.name,
        source_file_name = excluded.source_file_name,
        source_feature_name = excluded.source_feature_name,
        boundary_geometry = excluded.boundary_geometry,
        bbox = excluded.bbox,
        area_hectares_estimate = excluded.area_hectares_estimate,
        updated_at = now()
    `,
    [
      ranchRef,
      ranch.code,
      ranch.name,
      ranch.source_file_name,
      ranch.source_feature_name,
      ranch.boundary_geometry_wkt,
      buildBboxPolygonWkt(ranch.bbox),
      ranch.area_hectares_estimate,
    ],
  );

  for (const [index, zone] of options.seed.zones.entries()) {
    const zoneRef = deriveZoneRef(zone.code, zone.name);
    await options.bakkiCore.query(
      `
        insert into bakki_zone (
          zone_ref,
          ranch_ref,
          zone_code,
          name,
          status_label,
          prototype_interactive,
          sort_order,
          boundary_geometry,
          bbox,
          area_hectares_estimate,
          source_file_name,
          source_feature_name,
          updated_at
        )
        values (
          $1,
          $2,
          $3,
          $4,
          'Mapped',
          $5,
          $6,
          ST_Multi(ST_GeomFromText($7, 4326)),
          ST_GeomFromText($8, 4326),
          $9,
          $10,
          $11,
          now()
        )
        on conflict (zone_ref)
        do update set
          ranch_ref = excluded.ranch_ref,
          zone_code = excluded.zone_code,
          name = excluded.name,
          status_label = excluded.status_label,
          prototype_interactive = excluded.prototype_interactive,
          sort_order = excluded.sort_order,
          boundary_geometry = excluded.boundary_geometry,
          bbox = excluded.bbox,
          area_hectares_estimate = excluded.area_hectares_estimate,
          source_file_name = excluded.source_file_name,
          source_feature_name = excluded.source_feature_name,
          updated_at = now()
      `,
      [
        zoneRef,
        ranchRef,
        zone.code,
        zone.name,
        zoneRef === 'zone-3',
        (index + 1) * 10,
        zone.geometry_wkt,
        buildBboxPolygonWkt(zone.bbox),
        zone.area_hectares_estimate,
        zone.source_file_name,
        zone.source_feature_name,
      ],
    );
  }
}
