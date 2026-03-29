# Bakki Implementation Todo

This file is the execution backlog for the current architecture.

Canonical references:

- `plan.MD`
- `design.md`
- `database.md`
- `handoff.md`
- `prototype/` for legacy migration reference only

## 0. Rules

- [x] Do not add more product logic to `prototype/`
- [x] Treat `prototype/` as a legacy migration reference only
- [x] Keep web and desktop on one shared frontend codebase
- [x] Keep frontend behind NestJS, never direct-to-Odoo
- [x] Use `yarn` as the current workspace runner
- [x] Keep `plan.MD`, `todo.md`, `todo-backend.md`, `todo-deployment.md`, and `handoff.md` aligned with the Odoo Online + Bakki Core architecture

## 1. Completed

### Frontend foundation

- [x] Shared app shell and routing
- [x] First runnable Electron shell for the shared frontend, with a preload-backed desktop runtime config and a local static renderer server for packaged/local runs
- [x] Persist Electron sessions locally and forward them through desktop-only auth headers so packaged builds can talk to a hosted API origin without relying on browser cookie policy
- [x] Real login route plus session-gated shell access
- [x] Shell sign-out wired through the real auth/session flow
- [x] Native React pages for all current core routes
- [x] Route-level lazy loading for native pages and the global task modal
- [x] Add a bundle regression guard for entry-chunk size and emitted lazy page/modal chunks
- [x] Centralize shared React Query keys for map, phase, task, species, user, dashboard, and settings invalidation paths
- [x] Centralize the generic React Query invalidation executor and cover it with a direct unit test
- [x] Centralize settings mutation invalidation sets and cover them with direct query-helper tests
- [x] Centralize the remaining mutation invalidation sets for tasks, map, species, users, and phases with direct query-helper tests
- [x] Shared state, query, and modal foundation
- [x] Restore runtime prototype image variables locally so dashboard/sidebar/media surfaces do not fall back to empty gradients
- [x] OpenLayers-based map rendering from the provided KML files
- [x] Remove the hardcoded Zone 3-only map overlay path and support all current zone overlays in viewer/management
- [x] Keep the OpenLayers instance alive and update map sources in place instead of recreating the map on every geometry refresh
- [x] Restore the first working map-management toolset for selection mode and layer visibility
- [x] Split live map selection state into explicit zone vs area selections and render separate viewer/management surfaces for those states
- [x] Render `Map Viewer` and `Map Management` immediately with fixture-backed pending placeholders instead of blocking first paint on the initial live fetch
- [x] Keep `Map Viewer` and `Map Management` overlays closed until an explicit zone/area click and restore a prototype-shaped card section order
- [x] Restore floating map cards on `Map Viewer` and `Map Management`, with explicit close affordances and scrollable card bodies for longer live content
- [x] Replace fixed-color map action/tool assets with inline SVG controls so live active states and control colors can match the prototype
- [x] Make the `Map Management` layer button real so the legend card can be shown/hidden and reflect current layer/selection state
- [x] Lazy-load the OpenLayers runtime and show an explicit map-loading veil so `Map Viewer` and `Map Management` no longer flash a blank interactive surface on first paint
- [x] Add a real selected-area boundary edit/save flow to `Map Management`, with preview-backed saves when Bakki Core geometry persistence is unavailable
- [x] Move `Map Management` control ownership further toward the prototype split: the legend now owns ranch/zone/area visibility, while the tool stack now starts, resets, and exits boundary editing
- [x] Add a real selected-zone boundary edit/save flow to `Map Management`, keep the tool stack as the only edit-entry path for both areas and zones, and enforce strict zone-update validation before Bakki Core writes
- [x] Restore live zone/area hover treatment in the shared map runtime so `Map Viewer` and `Map Management` geometry responds before click instead of reading as static chrome
- [x] Restore the live zone-overview summary block in `Map Management` so zone selection shows dynamic density, fulfillment, tree-count, and planter context instead of a geometry-only shell
- [x] Tighten the idle `Map Management` area workflow so the footer returns directly to zone summary, geometry editing still starts only from the tool stack, and no-op saves stay disabled until the user changes metrics or boundary geometry
- [x] Make the `Map Viewer` area footer hand off directly into `Map Management` with the selected area preserved, so `Edit Area Geometry` is no longer a dead action
- [x] Split the oversized `Map Management` route into route-state orchestration plus dedicated canvas/overlay sections so the page no longer buries editing logic inside one large JSX block
- [x] Add live Map Management area lifecycle actions so operators can create, rename, edit, and delete Bakki Core areas directly from the management overlay
- [x] Refactor `Map Management` into explicit zone-info, edit-areas, create-area, and area-edit cards, with list-hover map highlighting and true map-drawn area creation
- [x] Align the `Map Viewer` and `Map Management` card CTAs with the shared sidebar button treatment, move those actions to the top of each card, constrain new-area drawing to the selected zone, add explicit finish-drawing support, and make the management toolbar self-describing
- [x] Make the `Map Viewer` ranch/zones pills and legend reflect real read-only layer visibility and live area-vs-zone focus state instead of static chrome
- [x] Remove the dedicated `Map Viewer` boilerplate fixture path so the page resolves solely from the shared ranch/zone/area data structures and returns honest empty overlay state when live records are missing
- [x] Replace the generic dashboard `phase-card-forest` and `zones-map` placeholder art with richer local forest and terrain surfaces so the homepage no longer reads as blank preview gradients
- [x] Make the dashboard map cards render a fallback geometry preview when live geometry data is unavailable, so `phase-card-forest` and `zones-map` still show a map silhouette in preview mode
- [x] Keep the map viewer and map management overlay cards anchored to the map edge and internally scrollable when the content exceeds the viewport
- [x] Surface the planting-phase fulfillment and density summary directly on each clickable timeline card
- [x] Restore the species detail flyout as a true overlay card instead of a row-adjacent block
- [x] Convert the inventory detail into a true split-page column and move stock intake/correction actions into the detail card, with tray-based intake calculation for added stock
- [x] Add a dedicated `Contracts` page plus backend contract rollups, and surface the global ranch contract completion on the homepage
- [x] Rework the `Contracts` page into a dense selectable zone grid plus a single zone-detail panel so high zone counts stay navigable without a long stacked page
- [x] Simplify the planting-phase team step into one full-width crew-selection card and remove the explicit field-lead picker from the UI
- [x] Keep `Task Management` and `Planting Phases` honest when the live task or phase backend is empty, so those pages stop showing canned fixture activity just because the live result set is zero rows
- [x] Make the global create-task flow area-only, wire personnel lookup to live users, and replace the remaining off-scale modal icons with inline SVG controls
- [x] Settings and support pages added to both prototype and live app

### Initial backend foundation

- [x] NestJS scaffold with module boundaries for auth, users, species, map, phases, tasks, media, dashboard, and audit
- [x] Odoo integration boundary scaffold exists
- [x] Runtime loading, empty, warning, and error states exist across live-query pages
- [x] First mutation flows exist for tasks, users, species, phases, monitoring, and area metrics
- [x] Species preview fallback now surfaces a clear Bakki Core-unavailable message instead of a generic internal server error
- [x] Odoo credential login now falls back to an Odoo-derived session when Bakki Core user mirrors are configured but unreachable instead of returning a generic internal server error
- [x] Centralize repeated map geometry validation/fallback/audit handling and Bakki geometry read-side SQL helpers so future area/zone persistence changes do not need copy-pasted updates
- [x] Clear the local runtime blockers on this machine by bringing up a real PostgreSQL/PostGIS Bakki Core target and an explicit local media provider for development, so `yarn doctor --json` and `yarn release:check --json` pass locally
- [x] Align the API route prefix with the DigitalOcean `/api` ingress so the hosted public contract is `GET /api/v1/...` instead of the broken double-prefix `GET /api/api/v1/...`
- [x] Remove the old Bakki Core preview-area seed rows from migrations/runtime cleanup paths so map area creation no longer collides with synthetic `area-preview-zone-*` records
- [x] Resolve auth audit actors to real `bakki_user` ids so Bakki Core audit writes no longer fail their actor foreign key during login/refresh/reset flows

## 2. Immediate Migration Work

### A. Architecture migration

- [x] Remove remaining self-hosted Odoo and Odoo custom-model assumptions from live code paths
- [x] Introduce the first Bakki Core database configuration and persistence boundary
- [x] Guard Bakki Core schema initialization against concurrent ensure-schema races
- [x] Move ranch and zone geometry ownership to Bakki Core PostGIS
- [x] Add provisional area geometry ownership to Bakki Core PostGIS for the current canonical contract areas
- [x] Add a GeoJSON import path for real area polygons into Bakki Core
- [x] Add CSV template/export/import tooling for Bakki Core area metrics and species inventory so Excel-held current-state data can be loaded without hand-written SQL
- [ ] Replace provisional area geometry with imported real area polygons once they are available
- [x] Move user/profile ownership to Bakki Core mirrors keyed by `odoo_user_id`
- [x] Move task ownership to Bakki Core mirrors keyed by `odoo_task_id`
- [x] Move planting phase persistence to Bakki Core tables and joins
- [x] Move area metrics and monitoring observations to Bakki Core tables
- [x] Move task-area linkage to Bakki Core mirrors
- [x] Track user/task mirror sync health in Bakki Core
- [x] Expose Bakki Core area geometry to the live map renderer

### B. Odoo Online integration

- [x] Configure the Odoo client for `bakki.odoo.com`
- [x] Use the Odoo API key as the service-to-service credential source
- [x] Keep end-user login validation separate from the service API key flow
- [x] Implement Odoo user sync
- [x] Fix current `res.users` role reads to use `group_ids` instead of the invalid `groups_id` field
- [x] Implement the first Odoo task sync path and mirror upserts
- [x] Add an owner-triggered manual Odoo mirror refresh path in the settings flow
- [x] Add a direct shell Odoo mirror refresh path for deployment/setup flows
- [x] Ensure manual mirror refresh retries errored task mirrors, not only recently updated tasks
- [x] Add a controlled owner-triggered Odoo task write probe path in the settings flow
- [x] Add an owner-triggered Odoo task-sync provisioning path for the default project and standard stages
- [x] Add direct shell commands for Odoo bootstrap and Bakki Core bootstrap
- [x] Add a direct shell runtime doctor command for Odoo, Bakki Core, media, and mirror diagnostics
- [x] Surface live weather-feed diagnostics for the dashboard conditions provider in the settings flow and shell doctor output
- [x] Extend runtime diagnostics with persisted Bakki Core geometry counts
- [x] Add an explicit deployment-blocker summary to the settings diagnostics and shell doctor output
- [x] Add backend-derived recommended remediation actions to the settings diagnostics and shell doctor output
- [x] Surface Bakki Core endpoint, PostgreSQL/PostGIS metadata, and migration status through the settings diagnostics and shell doctor output
- [x] Add a direct Bakki Core verification command that checks DB connectivity, PostGIS, migrations, and geometry-table presence without booting Nest
- [x] Treat reachable-but-misprovisioned Bakki Core states as explicit deployment blockers and remediation actions in diagnostics
- [x] Add a strict doctor mode that fails when deployment blockers are present
- [x] Add direct shell media probe commands for signing-only and upload verification
- [x] Add a non-destructive Spaces signing probe path in the settings flow
- [x] Add a full end-to-end Spaces upload probe path with verification and cleanup in the settings flow
- [x] Verify Odoo Online write-side sync behavior against `bakki.odoo.com`
- [x] Implement Odoo task create/read/update/sync (core flows wired; edge cases may need validation)
- [x] Require real Bakki Core area validation before task creation and re-verify the live Odoo write path with `yarn workspace @bakki/api odoo:bootstrap --json`

### C. Auth migration

- [x] Replace credential reveal/copy with password reset/regenerate
- [x] Remove recoverable-credential assumptions from contracts and services
- [x] Keep Bakki-managed sessions after Odoo validation
- [x] Audit reset/regenerate flows

## 3. Backend Persistence Work

- [x] Add Bakki Core schema for remaining area geometry metadata
- [x] Add PostGIS geometry validations and indexes
- [ ] Keep GeoJSON as API payload only
- [x] Add a repeatable shell validation command for the generated ranch/zone seed
- [x] Add a repeatable shell inspection command for detailed ranch/zone seed failures
- [x] Validate the current ranch/zone seed against topology rules before import

## 4. Frontend Follow-Up

- [x] Extract the remaining repeated map-overlay and settings/support utility surfaces into shared `packages/ui` primitives
- [x] Replace credential-reveal UI with reset/regenerate UI in `User Management`
- [ ] Fix remaining shell polish gaps:
  - sidebar brand icon rendering
  - shared button/tool icon sizing and spacing consistency
- [ ] Finish `Map Viewer` polish:
  - final spacing, typography, and responsive cleanup
- [ ] Finish `Map Management` polish and functionality:
  - finish the remaining workflow polish and responsive cleanup around the new zone-info / edit-areas / create-area card flow
- [x] Remove the dedicated `Planting Phases` fallback path so overview and wizard now rely solely on the shared live data structures
- [x] Remove the dedicated `User Management` fallback path so the page now hydrates solely from the shared live user data structures
- [x] Remove the dedicated `Task Management` fallback path so the page now hydrates solely from the shared live task data structures
- [x] Remove the dedicated `Species Management` fallback path so the page now hydrates solely from the shared live species data structures
- [ ] Add the remaining planting-phase historic detail surface:
  - planting-phase historic detail view
- [ ] Run UI consistency and responsive QA across all native routes
- [ ] Tighten cross-page consistency after the backend migration removes preview-era shortcuts

## 5. Integration And QA

- [x] Verify Odoo Online API access against `bakki.odoo.com`
- [ ] Verify Spaces-backed upload/finalize end to end once Spaces runtime secrets are configured
- [x] Add initial frontend unit tests for diagnostics-driven settings logic and shared settings/support/map UI surfaces
- [x] Add direct script-level regression tests for the web bundle guard
- [ ] Expand frontend unit coverage across routed pages and mutation-heavy workflows
- [x] Add initial API unit tests for Odoo task mapping and Bakki Core config resolution
- [x] Expand API test coverage for health/bootstrap/sync flows
- [ ] Add PostGIS geometry validation tests
- [ ] Add E2E owner workflow tests
- [ ] Fix layout drift and integration regressions

## 6. Deployment

- [x] Provision DigitalOcean app hosting for web and API
- [x] Provision DigitalOcean PostgreSQL/PostGIS for Bakki Core
- [ ] Provision Spaces for media
- [ ] Move secrets out of `API_Keys.txt`
- [x] Add a checked-in `.env.example` covering Odoo, Bakki Core, Spaces, and web runtime keys
- [x] Make API scripts and Vite load repo-root `.env` / `.env.local`
- [x] Add an owner-triggered Bakki Core migration action in the settings flow
- [x] Add an owner-triggered Bakki Core bootstrap action in the settings flow
- [x] Add a local env bootstrap script for generating `.env.local`
- [x] Add a local PostGIS dev stack and root DB helper scripts
- [ ] Run staging deployment end to end

## 7. Current Execution Order

1. close the current frontend polish gaps from the latest user review:
   - shell icon sizing and brand/icon rendering
   - `Map Viewer` polish and performance cleanup
   - `Map Management` workflow hardening and UI cleanup beyond the new zone-info / edit-areas / create-area workflow
2. harden the Electron desktop path:
   - packaging/signing workflow
   - final packaged-shell verification against the deployed DigitalOcean API origin now that hosted `/api/v1/health` is verified again
3. configure Spaces runtime secrets for hosted environments and rerun the media signing/upload probes
4. import real area polygons into Bakki Core to replace the provisional area geometry
5. UI consistency pass and QA

Note:

- geometry-seed promotability is now surfaced in:
  - `yarn doctor --json`
  - `yarn bakki-core:bootstrap --json`
  - `System Settings > Odoo > Bakki Core Readiness`
- direct local inspection artifacts now also exist via:
  - `yarn seed:geometry:debug`
  - `yarn seed:geometry:view`
- the current ranch/zone seed now passes `yarn seed:geometry:validate`
- invalid ranch/zone seed geometry is now blocked from Bakki Core promotion by default unless `BAKKI_CORE_ALLOW_INVALID_GEOMETRY_SEED=true` is set intentionally
- configured environments now also stop serving blocked seed geometry as live fallback unless that same override is enabled
- the settings page now distinguishes blocked geometry from `override enabled` geometry instead of collapsing both into one warning state
