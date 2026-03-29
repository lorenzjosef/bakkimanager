# Geometry Seed

This folder contains generated seed artifacts derived from the source KML files in the repo root.

Current command:

```sh
yarn seed:geometry
```

Validation command:

```sh
yarn seed:geometry:validate
```

The validation command exits non-zero when the current seed has containment failures, overlap failures, or invalid zone geometry such as self-intersections.

Inspection command:

```sh
yarn seed:geometry:inspect
```

The inspection command prints the same validation summary without failing, including:

- which zone vertices sit outside the ranch boundary
- which zones have invalid geometry or self-intersections
- which zone pairs have strict segment crossings

Debug GeoJSON command:

```sh
yarn seed:geometry:debug
```

This writes `docs/seeds/geometry-debug.geojson` with:

- the ranch polygon
- all zone polygons
- point features for containment-failure vertices
- line features for each strictly crossing overlap segment pair

Debug HTML viewer command:

```sh
yarn seed:geometry:view
```

This writes `docs/seeds/geometry-debug.html`, a self-contained local viewer that embeds the current
debug GeoJSON and renders:

- the ranch polygon
- all zone polygons
- red points for containment-failure vertices
- orange segments for strict overlap crossings

Operator surfaces:

- `yarn doctor --json` now includes the current geometry-seed promotability status
- `yarn bakki-core:bootstrap --json` now includes the same geometry-seed validation block
- `System Settings > Odoo > Bakki Core Readiness` shows whether the current seed is promotable

Area import command:

```sh
yarn bakki-core:import-areas --file path/to/areas.geojson --dry-run
```

Remove `--dry-run` to commit the import into Bakki Core.

Current output:

- `geometry-seed.json`
- `geometry-debug.geojson` after running `yarn seed:geometry:debug`
- `geometry-debug.html` after running `yarn seed:geometry:view`

What the seed contains:

- one ranch payload
- five zone payloads
- WKT scaffold for ranch and zones
- estimated hectares
- bounding boxes
- basic containment/overlap validation report
- invalid-zone geometry validation report

Important:

- the seed pipeline is implemented
- the seed validation command is implemented
- the seed inspection command is implemented
- invalid ranch/zone seed geometry is blocked from Bakki Core promotion by default
- configured environments also stop serving blocked seed geometry as read-side fallback by default
- the current validation report is now clean
- `zones_within_ranch` is currently `true`
- the current `invalid_zone_geometries` list is empty
- the current `zone_overlap_pairs` list is empty
- authoritative area polygons are imported separately into Bakki Core from GeoJSON and stored as PostGIS geometry
- area import expects GeoJSON `FeatureCollection` features with:
  - `properties.areaRef` or `properties.area_ref` or `feature.id`
  - `properties.name` or `properties.areaName`
  - optional `properties.zoneRef` or `properties.zone_ref`
- if `zoneRef` is omitted, the importer will infer the parent zone by spatial containment

Treat `geometry-seed.json` as a bootstrap artifact for ranch and zone geometry. Real area polygons should be imported with `yarn bakki-core:import-areas`.

If you intentionally need to persist the current provisional ranch/zone seed into Bakki Core for local testing, set:

```sh
BAKKI_CORE_ALLOW_INVALID_GEOMETRY_SEED=true
```

Do not use that override as a default deployment setting.
