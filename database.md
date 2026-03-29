# Bakki Database Model

This document captures the target Bakki Core database structure under the Odoo Online SaaS architecture.

## Locked assumptions

- `bakki.odoo.com` is Odoo Online SaaS and is not the full Bakki database.
- Bakki Core uses a dedicated PostgreSQL/PostGIS database.
- Odoo Online remains the external source for Odoo account identity and Odoo task records.
- Bakki Core is authoritative for geometry, contracts, density, monitoring, audit, media metadata, and dashboard aggregates.
- GeoJSON is the API payload format; native PostGIS geometry is the authoritative storage format.
- Bakki does not store recoverable passwords.
- Password management in Bakki is owner-triggered reset/regenerate only.

## ASCII ER Diagram

```text
+---------------------+
|   odoo.users        |
+---------------------+
| odoo_user_id (ext)  |
| login / email       |
| active              |
| stage/task refs     |
+---------------------+
           |
           | mirrored into Bakki Core
           v
+------------------------+        1      * +---------------------------+
|      bakki_user        |---------------->|   bakki_phase_participant |
+------------------------+                 +---------------------------+
| id (PK)                |                 | phase_id (FK)             |
| odoo_user_id (unique)  |                 | bakki_user_id (FK)        |
| login                  |                 | state                     |
| display_name           |                 | created_at                |
| role                   |
| active                 |
| mobile_access_enabled  |
| sync_status            |
| sync_error             |
| sync_retry_count       |
| last_sync_attempt_at   |
| last_synced_at         |
+------------------------+
           ^
           |
           | 1
           |
           *
+------------------------+
|   bakki_audit_log      |
+------------------------+
| id (PK)                |
| actor_user_id (FK)     |
| event_type             |
| entity_type            |
| entity_id              |
| metadata_json          |
| created_at             |
+------------------------+


+--------------------+      1          * +------------------+      1          * +------------------+
|   bakki_ranch      |------------------>|    bakki_zone    |------------------>|    bakki_area    |
+--------------------+                   +------------------+                   +------------------+
| id (PK)            |                   | id (PK)          |                   | id (PK)          |
| name               |                   | ranch_id (FK)    |                   | zone_id (FK)     |
| code               |                   | code             |                   | code             |
| geometry           |                   | geometry         |                   | geometry         |
| hectare_total      |                   | hectare_total    |                   | hectare_total    |
| metadata_json      |                   | status           |                   | planting_status  |
+--------------------+                   | counters_json    |                   | notes            |
                                         +------------------+                   | primary_species_id|
                                                                                 +------------------+

Current implemented geometry + metric layer:

- `bakki_ranch`, `bakki_zone`, and `bakki_area` tables now exist in Bakki Core.
- ranch and zone geometry are seeded from `docs/seeds/geometry-seed.json`.
- canonical `bakki_area` rows now exist for the current contract areas, seeded from the current zone geometry as provisional area boundaries.
- real area polygons can now be imported into `bakki_area` from GeoJSON with `yarn bakki-core:import-areas --file path/to/areas.geojson [--dry-run]`.
- `bakki_area` now has database-level validation for:
  - geometry validity
  - containment inside the parent zone
  - non-overlap between sibling areas in the same zone
- `area_ref` is now FK-backed from `bakki_task`, `bakki_phase_area_contract`, `bakki_area_metrics`, and `bakki_area_observation`.
- `bakki_task_photo` and `bakki_observation_photo` now exist in Bakki Core for media metadata.
- `bakki_species` and `bakki_inventory_transaction` now exist in Bakki Core for inventory ownership.
- `bakki_map_audit` now exists in Bakki Core for map-side metric and geometry change history.

+------------------------+        *      1 +------------------+
| bakki_area_observation |----------------->| bakki_area_metrics |
+------------------------+                  +------------------+
| id (PK)                |                  | area_ref (PK)    |
| area_ref               |                  | zone_ref         |
| task_ref               |                  | area_name        |
| actor_user_id (FK)     |                  | current_density  |
| measured_density       |                  | current_tree_cnt |
| measured_tree_count    |                  | updated_at       |
| observed_at            |                  +------------------+
+------------------------+
                                                                                           |
                                                                                           | *..1
                                                                                           v
                                                                                 +-----------------------+
                                                                                 |    bakki_species      |
                                                                                 +-----------------------+
                                                                                 | id (PK)               |
                                                                                 | common_name           |
                                                                                 | botanical_name        |
                                                                                 | code                  |
                                                                                 | inventory_unit        |
                                                                                 | quantity_on_hand      |
                                                                                 | total_planted         |
                                                                                 | growth_phase          |
                                                                                 | area_type             |
                                                                                 | active                |
                                                                                 +-----------------------+
                                                                                           ^
                                                                                           |
                                                                                           | 1
                                                                                           |
                                                                                           | *
                                                                                 +----------------------------+
                                                                                 | bakki_inventory_transaction|
                                                                                 +----------------------------+
                                                                                 | id (PK)                    |
                                                                                 | species_id (FK)            |
                                                                                 | phase_id (FK, nullable)    |
                                                                                 | task_id (FK, nullable)     |
                                                                                 | delta_quantity             |
                                                                                 | reason                     |
                                                                                 | occurred_at                |
                                                                                 +----------------------------+


+------------------------+        1      * +--------------------------------+
|      bakki_phase       |---------------->|  bakki_phase_area_contract      |
+------------------------+                 +--------------------------------+
| id (PK)                |                 | id (PK)                        |
| phase_name             |                 | phase_id (FK)                  |
| start_date             |                 | area_ref                       |
| end_date               |                 | assigned_user_id (FK)          |
| field_lead_user_id(FK) |                 | contract_tree_goal             |
| crew_rotation          |                 | target_density_per_100sqm      |
| default_task_type      |                 | sequence                       |
| state                  |                 +--------------------------------+
| operational_notes      |
| description            |
+------------------------+


+------------------------+        1      * +------------------------+
|  bakki_task_template   |---------------->|      bakki_task        |
+------------------------+                 +------------------------+
| id (PK)                |                 | id (PK)                |
| task_type              |                 | odoo_task_id (unique)  |
| title                  |                 | template_id (FK)       |
| instructions           |                 | area_id (FK)           |
| youtube_url            |                 | phase_id (FK)          |
| checklist_template     |                 | assignee_user_id (FK)  |
| default_priority       |                 | workflow_state         |
+------------------------+                 | odoo_stage_id          |
                                           | odoo_stage_name        |
                                           | due_at                 |
                                           | priority               |
| geometry_snapshot      |
| monitoring_density     |
| monitoring_tree_count  |
| sync_status            |
| sync_error             |
| sync_retry_count       |
| last_sync_attempt_at   |
                                           +------------------------+
                                                     |
                                                     | 1
                                                     |
                                                     | *
                                           +------------------------+
                                           |    bakki_task_event    |
                                           +------------------------+
                                           | id (PK)                |
                                           | task_id (FK)           |
                                           | actor_user_id (FK)     |
                                           | event_type             |
                                           | message                |
                                           | created_at             |
                                           +------------------------+


Long-term target after imported real area polygons replace the provisional canonical areas:

+------------------------+        *      1 +------------------+
| bakki_area_observation |----------------->|   bakki_area     |
+------------------------+                  +------------------+
| id (PK)                |
| area_id (FK)           |
| author_user_id (FK)    |
| observed_at            |
| measured_height        |
| measured_tree_count    |
| measured_density_100m2 |
| survival_per_100m2     |
| notes                  |
+------------------------+
            ^
            | 1
            |
            | *
+---------------------------+
| bakki_observation_photo   |
+---------------------------+
| id (PK)                   |
| observation_id (FK)       |
| object_key                |
| storage_provider          |
| storage_bucket            |
| asset_url                 |
| mime_type                 |
| caption                   |
| uploaded_at               |
+---------------------------+

+--------------------+      *          1 +------------------------+
|  bakki_task_photo  |------------------>|      bakki_task        |
+--------------------+                   +------------------------+
| id (PK)            |
| task_id (FK)       |
| object_key         |
| storage_provider   |
| storage_bucket     |
| asset_url          |
| mime_type          |
| caption            |
| uploaded_at        |
+--------------------+

+--------------------+      *          1 +------------------+
|  bakki_map_audit   |------------------>|   bakki_ranch    |
+--------------------+                   +------------------+
| id (PK)            |
| ranch_id (FK)      |
| editor_user_id(FK) |
| entity_type        |
| entity_id          |
| change_summary     |
| diff_payload       |
| created_at         |
+--------------------+

## Relationship Notes

### Odoo and Bakki Core

- Odoo Online users are mirrored into `bakki_user` through `odoo_user_id`.
- Odoo tasks are mirrored into `bakki_task` through `odoo_task_id`.
- `bakki_user` and `bakki_task` now track sync health with:
  - `sync_status` — one of `synced`, `pending`, `error`
  - `sync_error` — nullable text capturing the last sync failure message
  - `sync_retry_count` — integer tracking consecutive failed sync attempts
  - `last_sync_attempt_at` — timestamp of the last sync attempt (success or failure)
  - `last_synced_at` — timestamp of the last successful sync (distinct from attempt)
- Manual mirror refresh via the settings page retries errored mirrors, not only recently updated records.
- The frontend reads Bakki Core data through NestJS, not raw Odoo payloads.

### Geography

- One `bakki_ranch` has many `bakki_zone`.
- One `bakki_zone` has many `bakki_area`.
- Every `bakki_area` must belong to exactly one `bakki_zone`.
- Areas must stay within their parent zone.
- Sibling areas must not overlap.

### Planting contracts

- `bakki_phase_area_contract` is the explicit join table between planting phases and area references.
- Each row represents one contract assignment for one area in one phase.
- During an active planting phase, one area can have only one assigned planter.
- Each `bakki_phase_area_contract` must store:
  - assigned planter
  - contract tree goal
  - target density per 100m²

### Tasks

- `bakki_task_template` is now implemented in Bakki Core as the catalog for task labels, descriptions, checklist counts, and default task metadata.
- `bakki_task` mirrors Odoo task identity and stores Bakki-only state.
- Bakki UI must use `workflow_state`, not raw Odoo stage names, for behavior.
- Tasks keep a geometry snapshot only.
- `bakki_task.geometry_snapshot` is now implemented in Bakki Core and is captured from the authoritative area geometry catalog when a task is created with an area assignment.
- Monitoring-task completion must produce a new density per 100 square meters and may also produce a new tree count for the linked area.

### Species and inventory

- A `bakki_area` may reference one primary species.
- `bakki_area` stores the current tree count and current density per 100 square meters as first-class operational metrics.
- Inventory uses a stored running total plus transaction log.

### Observations and media

- An area can have many observations.
- `bakki_area_observation` must support measured density per 100 square meters and optional measured tree count.
- Area photo galleries are derived from related observations and tasks, not stored as a separate area-owned media table in v1.

### Audit

- `bakki_map_audit` is the MVP geometry-change history.
- `bakki_audit_log` records privileged actions and auth events such as login, logout, reset, user onboarding, user deactivation/reactivation, inventory adjustment, and sensitive configuration changes.

## Storage Rules

- Store authoritative spatial data as native PostGIS geometry only.
- Convert geometry to GeoJSON in the NestJS API layer when serving the frontend.
- Do not persist parallel GeoJSON and WKT copies in application tables.
- Do not store recoverable passwords in Bakki Core.
- Odoo API keys and service secrets must live in runtime secret configuration, not `API_Keys.txt`, once deployment is in place.

## Baseline indexes and constraints

- spatial indexes on ranch, zone, and area geometry
- index on `bakki_zone.ranch_id`
- index on `bakki_area.zone_id`
- unique index on `bakki_user.odoo_user_id`
- unique index on `bakki_task.odoo_task_id`
- index on `bakki_user.sync_status`
- index on `bakki_task.sync_status`
- unique index or equivalent uniqueness rule on `bakki_phase_area_contract (phase_id, area_ref)`
- index on `bakki_task.area_id`
- index on `bakki_task.phase_id`
- index on `bakki_inventory_transaction.species_id`
- index on `bakki_observation_photo.observation_id`
- index on `bakki_task_photo.task_id`

## Operational rules

- geometry snapshot only
- contract-based area assignment through `bakki_phase_area_contract`
- explicit phase-area contract link model
- density edits outside monitoring are allowed as direct updates to `bakki_area.current_density` and optional direct edits to `bakki_area.current_tree_cnt`
- manual density edits do not implicitly create observation rows; monitoring-task completion remains the observation-producing workflow
