# Tree Survey Support for Arbitrary Plot Geometries

## Problem and Current State

Today, tree survey data is area-centric:

- `bakki_area_metrics` stores one current density/tree-count per `area_ref`.
- `bakki_area_observation` logs observations keyed to one `area_ref`.
- `recordMonitoringResult` writes a single task-linked area observation and updates that area’s metrics.
- map/contracts/dashboard rollups read area-level metrics and aggregate by zone.

This works only when an observation naturally belongs to one area and area-level density is sufficiently uniform.

## Why It Fails the New Requirement

It cannot correctly represent:

- one surveyed plot crossing multiple areas or zones,
- sub-area heterogeneity (different density/size behavior inside one area),
- updating whole-plot estimates from a subset of sampled subzones.

Current write paths force a survey into exactly one `area_ref`, which misattributes data whenever a plot spans boundaries.

## Proposed Change

Introduce a plot-centric survey model while keeping area/zone as reporting boundaries:

1. Add `bakki_tree_plot` as the source geometry for survey units (arbitrary polygons, not constrained to one area/zone).
2. Add `bakki_tree_plot_sample` for sampled observations (counts + size metrics + sampled sub-geometry/area).
3. Add `bakki_tree_plot_estimate` as derived/current estimate snapshot per plot.
4. Compute plot-to-area/zone intersections for reporting rollups (query-time or persisted cache), so area/zone remain reporting dimensions, not data ownership anchors.
5. Keep compatibility by projecting plot estimates into existing area-facing responses where needed (fallback to legacy `bakki_area_metrics` until migrated).

### Per-tree feasibility at 120,000 trees

Per-tree rows are technically feasible in Postgres/PostGIS at this volume (120k points is manageable), but they add capture/storage/UX overhead and are not required for accurate operational estimates. Recommended approach:

- make estimate-first plot+sample model the default,
- support optional exact trees as a secondary path (e.g., later `bakki_tree_instance` table or imported exact counts) without blocking delivery.

## Implementation Plan

### 1) Domain and persistence

- Add domain types for:
  - plot geometry,
  - sample observation payload,
  - tree size metrics (e.g., mean height/diameter + optional distribution buckets),
  - estimate outputs and confidence metadata.
- Add Bakki Core tables:
  - `bakki_tree_plot`
  - `bakki_tree_plot_sample`
  - `bakki_tree_plot_estimate`
- Add indexes for geometry intersection and time-based sample retrieval.

#### Schema Detail

```sql
-- bakki_tree_plot: arbitrary survey geometries (not FK'd to area/zone)
CREATE TABLE bakki_tree_plot (
  plot_ref TEXT PRIMARY KEY,
  ranch_ref TEXT NOT NULL REFERENCES bakki_ranch(ranch_ref),
  name TEXT NOT NULL,
  description TEXT,
  boundary_geometry GEOMETRY(MultiPolygon, 4326) NOT NULL,
  bbox GEOMETRY(Polygon, 4326),
  area_hectares NUMERIC,
  created_by_user_id BIGINT REFERENCES bakki_user(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- bakki_tree_plot_sample: partial observations with counts + size metrics
CREATE TABLE bakki_tree_plot_sample (
  id BIGSERIAL PRIMARY KEY,
  plot_ref TEXT NOT NULL REFERENCES bakki_tree_plot(plot_ref) ON DELETE CASCADE,
  sample_geometry GEOMETRY(MultiPolygon, 4326),  -- nullable = whole plot
  sampled_area_sqm NUMERIC,
  tree_count INTEGER NOT NULL,
  density_per_100sqm NUMERIC GENERATED ALWAYS AS (
    CASE WHEN sampled_area_sqm > 0 
         THEN (tree_count * 100.0 / sampled_area_sqm) 
         ELSE NULL END
  ) STORED,
  mean_height_m NUMERIC,
  mean_diameter_cm NUMERIC,
  size_distribution JSONB,  -- optional bins
  actor_user_id BIGINT REFERENCES bakki_user(id),
  task_ref TEXT,
  notes TEXT,
  sampled_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- bakki_tree_plot_estimate: computed snapshot per plot
CREATE TABLE bakki_tree_plot_estimate (
  plot_ref TEXT PRIMARY KEY REFERENCES bakki_tree_plot(plot_ref) ON DELETE CASCADE,
  estimated_tree_count NUMERIC NOT NULL,
  estimated_density_per_100sqm NUMERIC NOT NULL,
  mean_height_m NUMERIC,
  mean_diameter_cm NUMERIC,
  confidence_level TEXT,  -- 'low' | 'medium' | 'high'
  sample_count INTEGER NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2) Service layer

- Add `BakkiTreeSurveyService` to:
  - create/update plots,
  - record samples,
  - recompute plot estimates from samples,
  - expose rollup helpers by area/zone intersection.
- Keep changes surgical: reuse existing geometry/auth/audit patterns used by map/tasks services.

### 3) API layer

- Add plot survey endpoints (owner-only writes, read endpoints for reporting):
  - create/update/list plots,
  - record sample(s),
  - read plot estimate + sample history,
  - read area/zone reporting rollups derived from plots.
- Preserve existing endpoints; extend responses where needed to include source kind (`legacy_area_metrics` vs `plot_estimate_projection`).

### 4) Compatibility and migration strategy

- Keep existing `bakki_area_metrics` operational during transition.
- Add projection logic so downstream map/contracts/dashboard can read plot-derived metrics without immediate UI/API breakage.
- Provide controlled migration path:
  - no destructive rewrite of legacy observations,
  - additive model and gradual switchover.

### 5) Tests

- Unit tests:
  - estimate recomputation from partial samples,
  - overlap handling across multiple areas/zones,
  - heterogeneity behavior within one area.
- Service/API tests:
  - plot create/sample/estimate flows,
  - rollup correctness by area and zone,
  - backward compatibility for existing consumers.

## Notes / Decisions to Confirm Before Implementation

- Whether exact per-tree persistence should be implemented now or left as optional future extension.
- Minimum required tree-size metrics for v1 (mean-only vs distribution bins).
- Whether projection should immediately drive contracts fulfillment, or be introduced first behind a feature switch/fallback order.
