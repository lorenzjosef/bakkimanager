# Bakki Backend Todo

## 1. Bakki Core Database

- [x] Add Bakki Core database configuration and shared pool boundary for PostgreSQL/PostGIS
- [x] Add migrations/schema management for Bakki Core
- [x] Guard Bakki Core schema initialization against concurrent ensure-schema races and allow retry after failed initialization
- [x] Implement Bakki Core tables for user mirrors keyed by `odoo_user_id`
- [x] Implement Bakki Core tables for task mirrors keyed by `odoo_task_id`
- [x] Implement Bakki Core tables for ranch, zone, and area geometry
- [x] Implement Bakki Core tables for planting phases, phase participants, and area contracts
- [x] Implement Bakki Core tables for area metrics and observations
- [x] Implement Bakki Core tables for species and inventory transactions
- [x] Implement Bakki Core tables for audit log
- [x] Implement Bakki Core tables for map audit
- [x] Implement Bakki Core tables for media metadata
- [x] Move `Species Management` off the preview store/runtime fixture path so frontend reads now depend only on live Bakki species payloads

## 2. Geometry

- [x] Store authoritative geometry as native PostGIS geometry only
- [x] Add hectare calculations from geometry
- [x] Add area-within-zone validation
- [x] Add sibling overlap validation
- [x] Add spatial indexes and query helpers
- [x] Convert geometry to GeoJSON only at the API boundary
- [x] Expose ranch, zone, and area geometry through NestJS GeoJSON endpoints
- [x] Add a GeoJSON import path for real area polygons into Bakki Core
- [x] Add a repeatable shell validation command for the generated ranch/zone seed
- [x] Add a repeatable shell inspection command for detailed ranch/zone seed failures
- [x] Add a GeoJSON debug export for current ranch/zone containment failures and overlap segments
- [x] Add a self-contained HTML debug viewer for the current ranch/zone containment failures and overlap segments
- [x] Block invalid ranch/zone seed promotion into Bakki Core by default unless explicitly overridden
- [x] Stop configured environments from serving blocked seed geometry as read-side fallback unless explicitly overridden
- [x] Validate the generated ranch/zone seed against topology rules before import
- [x] Validate the generated ranch/zone seed against self-intersection and PostGIS-style geometry-validity failures before import
- [x] Add strict zone-update validation for ranch containment, sibling-zone overlap, and child-area coverage in the live map geometry update path
- [x] Add a `PATCH /map/zones/:zoneId/geometry` write path with preview fallback when Bakki Core geometry persistence is unavailable
- [ ] Replace provisional `bakki_area` rows with real imported area polygons and keep map detail/edit flows keyed to those real areas

## 3. Odoo Online Adapter

- [x] Replace legacy self-hosted Odoo assumptions with Odoo Online SaaS assumptions in the core plan/docs
- [x] Use `bakki.odoo.com` as the Odoo base URL
- [x] Load the Odoo service API key from environment, with `API_Keys.txt` as local fallback only
- [x] Add a checked-in `.env.example` for current runtime configuration keys
- [x] Make API scripts load repo-root `.env` / `.env.local` automatically
- [x] Add an owner-triggered Bakki Core migration endpoint for schema bootstrap once DB config is present
- [x] Add an owner-triggered Bakki Core bootstrap endpoint for migrations plus initial seed data once DB config is present
- [x] Add a direct shell bootstrap command for Bakki Core migrations plus seed initialization
- [x] Add a local env bootstrap script for generating `.env.local`
- [x] Add a local PostGIS dev stack for Bakki Core
- [x] Add a checked local Bakki Core DB wrapper that reports missing Docker/env prerequisites before compose startup
- [x] Extend the local Bakki Core DB doctor to report the resolved DB target and TCP reachability
- [x] Implement Odoo 19 `JSON-2` service client support for the common ORM calls already used by the API layer
- [x] Keep a separate user-credential validation path for login
- [x] Implement Odoo user lookup/sync
- [x] Fix current Odoo user role reads to use `res.users.group_ids` instead of the invalid `groups_id` field
- [x] Implement Odoo task create/read/update/sync (create, workflow-state update, and mirror sync are wired)
- [x] Implement stage-to-Bakki-workflow mapping using standard Odoo stage names and Bakki-side heuristics
- [x] Track sync errors and retry state on mirrored Bakki records
- [x] Verify read-side API connectivity against `bakki.odoo.com`
- [x] Add write-readiness diagnostics for default project and standard task-stage mapping without mutating the live tenant
- [x] Add an owner-triggered mirror refresh path that resyncs users and recent tasks from Odoo without mutating the tenant
- [x] Add an owner-triggered provisioning path for the default Odoo project and missing standard task stages
- [x] Add a controlled owner-triggered Odoo task write-probe path for create/update/mirror verification
- [x] Add a direct shell bootstrap command for Odoo task-sync provisioning and write verification
- [x] Add a direct shell mirror-sync command for Odoo users/tasks
- [x] Add a direct shell runtime-doctor command for Odoo, Bakki Core, media, and mirror diagnostics
- [x] Surface live Open-Meteo weather-feed diagnostics through the runtime doctor and settings flow
- [x] Surface geometry-seed promotability through the runtime doctor, Bakki Core bootstrap result, and settings diagnostics
- [x] Surface Bakki Core endpoint, PostgreSQL/PostGIS metadata, and migration status through the runtime doctor and settings flow
- [x] Add a direct `yarn bakki-core:verify` command for DB-level Bakki Core verification without creating a Nest app context
- [x] Treat missing PostGIS and missing Bakki Core migrations as explicit deployment blockers and remediation actions when the DB is reachable
- [x] Add direct shell media probe commands for signing-only and upload/verify/cleanup checks
- [x] Verify live Odoo Online write-side task sync against `bakki.odoo.com`
- [x] Surface a clear species preview-fallback blocker when Bakki Core is configured but unreachable instead of returning a generic internal server error

## 4. Auth And User Flows

- [x] Remove recoverable-credential storage from the active auth and user flows
- [x] Replace credential reveal/copy with owner-triggered password reset/regenerate
- [x] Audit login, logout, refresh, reset, onboarding, deactivate/reactivate
- [x] Mirror Odoo users into Bakki Core keyed by `odoo_user_id`
- [x] Keep Bakki-managed sessions after Odoo credential validation
- [x] Degrade valid Odoo login to an Odoo-derived in-memory session when Bakki Core user mirrors are configured but currently unreachable
- [x] Revoke Bakki sessions immediately after mirrored user deactivation or failed revalidation

## 5. Tasks, Phases, Monitoring

- [x] Implement a Bakki-owned task-template catalog for labels/defaults instead of relying only on hardcoded frontend task types
- [x] Mirror Odoo tasks into Bakki Core keyed by `odoo_task_id`
- [x] Preserve geometry snapshot on Bakki task records
- [x] Keep contract-based phase area assignments in Bakki Core
- [x] Keep one assigned planter per area during an active phase
- [x] Persist monitoring-result writes in Bakki Core and sync task status back to Odoo
- [x] Keep density/tree-count metrics authoritative in Bakki Core
- [x] Keep task-to-area linkage authoritative in Bakki Core mirrors instead of custom Odoo area fields
- [ ] Expose the remaining map-viewer and map-management zone-vs-area detail payloads needed for separate zone and area cards
- [ ] Expose historic phase detail, contract-fulfillment, and density aggregates for the planting-phase detail view

## 6. Media

- [ ] Keep media object storage in Spaces
- [x] Keep media metadata in Bakki Core
- [x] Add an explicit local-filesystem media provider for local development so the stack can run without fake Spaces blockers while keeping Spaces as the hosted provider
- [x] Add a non-destructive Spaces signing probe path for backend/settings verification
- [x] Add a full signed upload/verify/cleanup probe path for backend/settings verification
- [ ] Verify signed upload/finalize against a real bucket once Spaces runtime secrets are configured
- [ ] Keep Odoo out of binary/media storage responsibility

## 7. Migration Work

- [x] Normalize live audit target-model naming away from legacy Odoo custom-model identifiers for Bakki-owned entities
- [x] Remove new feature reliance on `odoo/custom_addons/bakki`
- [x] Migrate remaining service code off custom Odoo models; live auth/users/phases/map/monitoring/species flows are now off the old custom Odoo model path
- [ ] Migrate service code off Odoo-stored geometry assumptions
- [x] Seed provisional canonical area rows into `bakki_area` using current zone geometry
- [x] Add a replaceable import path for real area polygons via `yarn bakki-core:import-areas`
- [ ] Replace provisional canonical area rows with imported real area polygons once area geometry is provided
- [ ] Replace free-text bridges with explicit Bakki Core fields

## 8. Tests

- [ ] Unit test PostGIS geometry validators and helpers
- [x] Add direct script-level regression coverage for the geometry seed summary, check mode, failing invalid-KML check mode, and debug artifact generation
- [x] Add direct script-level regression coverage for local Bakki Core DB env-file resolution and prerequisite blockers
- [x] Add initial API unit tests for Odoo task mapping and Bakki Core config resolution
- [x] Expand API unit coverage for health diagnostics, Bakki Core bootstrap/migration gating, Odoo mirror sync, task-sync provisioning, and the Odoo write probe
- [x] Expand API unit coverage for dashboard weather diagnostics and weather-aware health output
- [x] Add API unit coverage for geometry-seed fallback policy in configured vs non-configured environments
- [x] Add API unit coverage for `MapService` behavior when configured geometry is missing and seed fallback is blocked
- [x] Add API unit coverage for area and zone geometry update preview fallback vs hard validation failures
- [ ] Integration test Odoo Online adapter calls
- [ ] Integration test Bakki Core persistence
- [ ] E2E test user login/session/reset flow
- [ ] E2E test task sync and workflow-state mapping
- [ ] E2E test monitoring-result updates and density propagation
