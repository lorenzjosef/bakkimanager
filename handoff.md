# Handoff

## Snapshot

Bakki is now on the intended architecture:

- `Odoo Online SaaS` at `bakki.odoo.com`
- `NestJS` as the only frontend-facing API
- `Bakki Core` in PostgreSQL/PostGIS for Bakki-owned domain data
- `DigitalOcean Spaces` as the hosted media target, with an explicit `local-filesystem` provider now available for local development only

The next developer should treat the current work as a frontend-hardening, workflow-completion, Electron-hardening, and deployment-readiness phase, not as another architecture-migration phase.

## Latest Deployment Rollout

Hosted DigitalOcean app hosting is now up for both the web shell and API.

- app: `bakki-admin`
- ingress: `https://bakki-admin-llhzr.ondigitalocean.app`
- latest active deployment: `835c4d50-327e-43c3-a20d-e9201be72063`
- managed Bakki Core cluster: `bakki-core-fra-20260329` (`5032b67a-20fa-415f-8257-ea998d7be48e`)
- verified on March 29, 2026:
  - `GET /api/v1/health` returns `200`
  - `GET /api/v1/auth/session` returns `200` with `{"session":null}` when unauthenticated
  - hosted app was redeployed after the Bakki Core cutover and stayed healthy on the public ingress
  - hosted `GET /api/v1/map/ranch/geometry` now returns `1` persisted ranch feature
  - hosted `GET /api/v1/map/zones/geometry` now returns `5` persisted zone features
  - the previous managed Bakki Core cluster `bakki-core-fra` (`e0c6fee2-7f60-49f4-8186-7aae3a34f219`) was deleted after the cutover

Root cause of the earlier failure:

- the API had been serving `api/v1` internally while DigitalOcean ingress already mounted the service at `/api`, producing a public double prefix (`/api/api/v1/...`)
- the failing readiness probe was hitting `/v1/health` while the older container still exposed `/api/v1/health`

Fix that is now in place:

- API default global prefix now falls back to `v1`
- local Vite dev proxy now strips `/api` before forwarding to the API process
- local desktop direct API defaults now target `http://127.0.0.1:4175/v1`
- refreshed `linux/amd64` images were pushed to DOCR on the existing `bakki-web:api` and `bakki-web:latest` tags before the successful rollout

## Latest Data-Source Cleanup

The most recent pass removed the remaining runtime fixture/preview data paths.

- dashboard and map-management frontend queries no longer fall back to local fixtures or preview banners
- `/api/v1/dashboard/summary`, `/api/v1/map/viewer`, and `/api/v1/map/management` now build from backend records plus explicit empty/unavailable states only
- map geometry writes, area-metrics writes, and phase creation now return honest unavailable errors when the backing services are down instead of writing preview data
- Bakki Core geometry reads no longer fall back to seed documents, and schema init no longer auto-promotes hardcoded geometry into runtime tables
- the stale `area-preview-zone-*` rows from the early Bakki Core area-integrity migration are now removed by a dedicated cleanup migration, and the old seed-promotion helper no longer re-inserts contract-placeholder areas into `bakki_area`
- auth audit persistence now resolves `user-profile-*` and `user-*` actors through `bakki_user` correctly, so login/refresh/reset audit events no longer trip the `bakki_audit_log_actor_user_id_fkey` constraint when Bakki mirrors exist

## Latest Recovery Tooling

A replayable Bakki Core data snapshot now lives under `migrate/`.

- `migrate/bakki-core-current.sql` is a plain PostgreSQL data-only snapshot of the current Bakki Core state
- `migrate/bakki-core-current.counts.json` records the exported row counts
- `migrate/export-bakki-core-snapshot.mjs` refreshes the snapshot from the configured `BAKKI_CORE_DATABASE_URL`
- `migrate/import-bakki-core-snapshot.mjs` truncates Bakki domain tables and restores that snapshot
- `migrate/export-bakki-tabular-templates.mjs` now writes:
  - `migrate/area-metrics.template.csv`
  - `migrate/species-inventory.template.csv`
- `migrate/import-area-metrics-from-csv.mjs` imports current `bakki_area_metrics` state from Excel-exported CSV
- `migrate/import-species-inventory-from-csv.mjs` imports current `bakki_species` state from Excel-exported CSV
- the export now strips `ALTER TABLE ... DISABLE/ENABLE TRIGGER ALL` and rewrites the dump `search_path` to `public, pg_catalog`, because the managed DigitalOcean PostgreSQL target rejected trigger toggles and the geometry trigger depends on PostGIS functions resolving on `public`
- the managed Bakki Core dataset was restored after validating that portability fix and re-verified at:
  - `bakki_ranch=1`
  - `bakki_zone=5`
  - `bakki_area=1`
  - `bakki_user=5`
  - `bakki_species=4`
  - `bakki_task_template=3`
  - `bakki_task=1`
  - `bakki_map_audit=1`
  - `bakki_audit_log=15`
- the CSV template/export/import workflow was validated locally:
  - `node --env-file-if-exists=.env --env-file-if-exists=.env.local migrate/export-bakki-tabular-templates.mjs`
  - `node --env-file-if-exists=.env --env-file-if-exists=.env.local migrate/import-area-metrics-from-csv.mjs --dry-run`
  - `node --env-file-if-exists=.env --env-file-if-exists=.env.local migrate/import-species-inventory-from-csv.mjs --dry-run`

## What Is Implemented

### Frontend

- native React pages exist for:
  - Dashboard
  - Map Viewer
  - Map Management
  - Planting Phases overview and wizard
  - User Management
  - Species Management
  - Task Management
  - System Settings
  - Support
- the web shell now requires a real session:
  - preview auto-login is removed
  - `/login` is a real route
  - shell logout is wired
- runtime prototype asset variables are applied at startup, so local assets can power the sidebar brand mark, dashboard visual cards, owner avatar, and species chips
- the shell brand mark, owner avatar, and dashboard forest / zones-map surfaces now also bind their local assets directly in component render paths instead of relying only on root CSS variables
- generated local glyph-based asset icons now render larger and more centrally, reducing the remaining button/tool icon drift across map, task, and utility surfaces
- local web API calls now prefer the same-origin `/api/v1` dev proxy on loopback hosts, so the `bakki_session` cookie is no longer rejected in local `localhost` vs `127.0.0.1` login flows
- the local web dev proxy now also strips the leading `/api` segment before forwarding to the API process, matching the hosted DigitalOcean ingress contract so browser requests keep the same public `/api/v1/...` shape locally and in production
- `Map Viewer` and `Map Management` are no longer locked to `zone-3`
- the OpenLayers wrapper now updates sources in place instead of destroying/recreating the map on geometry refresh
- `Map Viewer` and `Map Management` now wait for live backend responses and show explicit loading/unavailable states instead of placeholder fixture payloads
- map-management tools now drive real selection-mode and layer-visibility changes
- the shared map/runtime selection contract now distinguishes `zone` selections from `area` selections, and selected areas now highlight independently from their parent zones
- `Map Viewer` and `Map Management` overlays now stay closed until the user explicitly clicks a zone or area on the map
- `Map Viewer` now renders a separate zone-overview surface and area-detail surface instead of forcing both states through one blended overlay card
- `Map Management` now separates zone overview from the editable area-metrics editor, so area editing only appears when an actual area is selected
- both live map cards now follow the prototype section order more closely again, removing the extra context and density-summary blocks that had drifted away from the approved card geometry
- both live map cards now use prototype-native floating overlay markup again instead of the stretched drawer treatment, and their card bodies scroll independently when longer live content is present
- map viewer and map-management close, save, footer-action, and tool-stack icons now use the prototype-sized per-control dimensions again instead of one generic override
- the map pages now also render those close/action/tool icons as inline SVG controls instead of fixed-color data-URI glyphs, so active and inactive states can follow the prototype color treatment
- the `Map Management` layer button is now real and toggles the legend card, and the legend rows now dim when the corresponding layer or selection state is inactive
- the late shared overlay-height override now uses max-height instead of a forced bottom anchor, so the live map cards no longer fight the prototype’s smaller-screen docking rules
- the shared map hook now lazy-loads the `@bakki/map` runtime and both map pages show an explicit runtime-loading veil while the interactive terrain/geometry surface boots, so first paint no longer looks blank before the OpenLayers handle is ready
- `Map Management` now supports real selected-area and selected-zone boundary edit/save flows: the tool stack is now the only entry point into geometry editing, the card reflects draft coordinates while editing, area saves go through `/api/v1/map/areas/:areaId/geometry`, and zone saves go through `/api/v1/map/zones/:zoneId/geometry`
- zone geometry writes now validate ranch containment, sibling-zone overlap, and child-area coverage before Bakki Core updates; connectivity failures now surface honest unavailable errors instead of preview overrides
- `Map Management` now supports live area lifecycle actions end to end: zone selection can create a new Bakki Core area from the selected zone geometry, area selection can rename/update/delete the selected area, and the management payload now includes area-specific detail records by area id so multi-area zones behave correctly
- `Map Management` now also uses an explicit card flow instead of one mixed properties panel:
  - clicking a zone opens a `Zone Info` card with `Add Area`, `Edit Areas`, and zone-boundary editing
  - `Edit Areas` shows all areas in the selected zone, and hovering a list row now highlights that area on the map through the shared runtime
  - `Create Area` now uses a true map-drawn polygon draft instead of cloning the zone geometry first
  - area editing now lives in its own `Edit Area` card with back-navigation to the area list
- the map cards now keep their main actions at the top of the overlay and reuse the shared sidebar-button treatment, so `Map Viewer` and `Map Management` no longer bury the primary actions in footer-only controls
- `Map Viewer` no longer offers `Edit Area Geometry`; area selections now hand off into `Map Management` explicitly
- new-area drawing in `Map Management` is now constrained to the selected zone and exposes an explicit `Finish Drawing` step, so the area boundary coordinates populate before the user submits `Create Area`
- `Map Management` control ownership is now closer to the prototype split: the legend rows own ranch, zone, and area visibility, while the pen tool enters boundary editing for the selected zone or area, the polygon tool resets a dirty boundary draft, and the node tool exits or discards the current edit session
- the `Map Management` left tool rail is now labeled, so selection, edit, reset, stop, and zoom actions are readable without relying on icon memory
- the `Map Management` route now keeps selection/edit orchestration in the route component while the static canvas chrome and properties overlay live in dedicated section components, reducing route-level JSX sprawl without changing the approved UI
- the shared OpenLayers runtime now also applies live hover styling for zones and areas, including pointer-state feedback and parent-zone hover when an area is under the cursor, so both map pages no longer read as static until click
- the zone-selection card in `Map Management` now uses the live management summary block again, showing dynamic density, contract-fulfillment, tree-count, and assigned-planter values instead of only geometry/status fields
- the idle area-detail footer in `Map Management` now returns directly to the linked zone summary instead of reopening boundary editing, and `Save Changes` stays disabled until density, tree count, or boundary geometry has actually changed
- the `Map Viewer` area-detail action row now opens `Map Management` with the same selected area preserved via a route handoff, so the cross-page area-management workflow is explicit instead of dead chrome
- the `Map Viewer` ranch and zones pills now toggle real read-only layer visibility, and the legend now dims hidden layers and reflects area-vs-zone focus instead of staying static
- the dedicated `Map Viewer` boilerplate fixture path is now removed: `/map/viewer` builds its overlays from ranch, zone, area, contract, and metrics structures only, and the page now renders honest empty overlay state instead of fallback viewer copy
- the dashboard and map-management routes no longer use fixture-backed queries, preview banners, or placeholder management datasets; both pages now hydrate solely from backend responses
- the shared local asset layer now also renders richer forest and terrain surfaces for the dashboard hero cards, so `phase-card-forest` and `zones-map` no longer read as generic placeholder gradients
- the dashboard map cards now also render a fallback geometry silhouette when live geometry queries are unavailable, so the homepage map surfaces still read as maps in preview mode instead of empty cards
- the live map overlays now anchor to the top-right edge of the map surface and scroll internally when their content outgrows the viewport, so the map cards stay usable on shorter screens
- the planting-phase timeline cards now surface the contract-fulfillment and density summary directly on the selectable cards, so completed phases expose their key area metrics before the detail panel opens
- the `/planting-phases/new/team` step no longer exposes a separate field-lead picker or the old split `Team Deployment` card layout; the step is now one full-width crew-selection card, while `fieldLeadId` continues to be derived internally from the selected crew for the existing create-phase API contract
- `Task Management` and `Planting Phases` now return honest empty live states when the configured task or phase backends currently have no records, so those pages no longer show fake seeded activity just because the live result set is empty
- `Planting Phases` overview and wizard no longer use fixture-backed queries, preview banners, or fixture-merged backend responses; both routes now hydrate solely from the shared phase overview and wizard data structures
- `User Management` no longer uses a fixture-backed query, preview banner, or preview-user mutation path; the page now hydrates solely from `/users/management`, and backend user reads/writes return honest unavailable errors instead of fabricating preview personnel
- `Task Management` no longer uses a fixture-backed summary query, preview banner, preview task mutation path, or runtime task-template fallback; the page now hydrates solely from `/tasks/summary` and `/tasks/templates`, with honest unavailable states when live task backends are down
- the global `Create Task` modal now assigns tasks to real Bakki Core `area` records only, drives the area picker from `/map/management`, and blocks submit unless a concrete `areaId` is selected
- the global `Create Task` modal now uses the live planter/personnel catalog from `/users/management`, so the personnel search field no longer behaves like dead placeholder text
- the global `Create Task` modal now uses inline SVG field/action icons instead of the old off-scale asset glyphs, bringing the task-type cards and footer actions back into the same visual size range as the rest of the shell
- `Species Management` no longer uses a fixture-backed query, preview banner, preview-species store, or fixture-derived detail payload; the page now hydrates solely from `/species` and `/species/:id`, and the flyout shows only live species fields
- the route label is now `Inventory`, and the species detail no longer floats above the table: on desktop it reserves a real right-hand column so the page content never sits underneath the open detail card
- stock actions now live on the inventory detail card itself:
  - `Add Stock` calculates the adjustment from `tray count x trees per tray`
  - `Update Stock` lets the operator enter the corrected stock count and calculates the resulting delta automatically
  - both actions still write through the existing Bakki inventory adjustment mutation path
- the shell now includes a dedicated `Contracts` page between `Planting Phases` and `User Management`
- `/api/v1/contracts/summary` now aggregates:
  - a fixed global ranch contract goal of `120,000` trees
  - zone contract goals from the latest area-level contract goals inside each zone
  - live planted tree totals by summing area tree counts into zones and zones into the ranch total
- the homepage now also shows the global ranch contract completion rate in a dedicated dashboard card, while the new `Contracts` page breaks down fulfillment by zone and shows which areas contribute to each zone total
- the `Contracts` page no longer stacks full area lists under every zone card; it now uses a compact selectable zone grid with one sticky selected-zone detail panel, and the zone grid is height-capped so large zone counts remain navigable without turning the whole page into a long vertical scroll
- the dashboard, planting-phase overview, and task-management map preview cards now use static image assets instead of live geometry thumbnails, and the old `StaticGeoPreview` component has been removed
- shared UI primitives and shared query invalidation helpers are in place
- the shared package entry points are now cleaned up further:
  - `@bakki/ui` no longer keeps its primitives in one monolithic file; primitives now live in category modules under `packages/ui/src/primitives/` with `packages/ui/src/primitives.tsx` acting as a barrel
  - `@bakki/map` no longer keeps its public package entry as the runtime monolith; `packages/map/src/index.ts` is now a barrel over `types.ts`, `map-runtime.ts`, and focused map helper modules
- the shared frontend now also runs inside a first Electron shell:
  - `apps/admin-desktop` creates a real `BrowserWindow`
  - a preload bridge exposes desktop runtime config to the shared frontend
  - packaged/local runs serve `apps/admin-web/dist` through a local static server instead of relying on the Vite proxy
  - `yarn dev:desktop` now starts API + web dev + Electron together for local development
  - desktop sessions now persist locally in Electron and travel through `x-bakki-session` / `x-bakki-client: desktop` headers instead of depending on cross-site cookies, so packaged desktop builds can authenticate against a hosted DigitalOcean API origin
- frontend build/typecheck currently pass:
  - `yarn workspace @bakki/admin-web typecheck`
  - `yarn workspace @bakki/admin-web build`
- frontend tests currently pass:
  - `yarn test:web`

### Backend

- Odoo Online read/write verification is implemented and exercised against `bakki.odoo.com`
- Bakki Core persistence exists for:
  - user mirrors
  - task mirrors
  - task templates
  - phases and phase-area contracts
  - geometry
  - area metrics and observations
  - species and inventory
  - audit and map audit
  - media metadata
- Bakki Core geometry is served as GeoJSON from Nest
- species list/detail reads now translate Bakki Core connectivity failures into explicit `503` responses, so the frontend now shows an honest unavailable state instead of a preview species fallback or a generic internal server error
- auth and user sync now request `res.users.group_ids` instead of the invalid `groups_id` field, removing the current tenant field mismatch that was breaking live auth/user reads on `bakki.odoo.com`
- live Odoo login now degrades to an Odoo-derived in-memory session when Bakki Core user-mirror persistence is configured but currently unreachable, so local login no longer throws a generic `500` just because PostgreSQL is down
- shared backend helpers now own the repeated map geometry validation/fallback/audit flow plus the repeated Bakki geometry read-side SQL shapes, reducing drift risk between area/zone mutations and persisted geometry reads
- `/api/v1/map/areas` now supports create, detail-update, geometry-update, metrics-update, and delete flows, with delete guarded against linked planting-phase contracts
- task creation now requires a real persisted area selection: the API rejects missing `areaId`, validates the selected area against Bakki Core geometry reads, and stops falling back to unvalidated free-text area labels when geometry is unavailable
- the API runtime now defaults its global route prefix to `v1`, so the hosted DigitalOcean `/api` ingress and local `/api` dev proxy both resolve the intended public `/api/v1/...` contract without requiring a double `/api` path
- backend-only data paths are now enforced:
  - geometry reads return only persisted Bakki Core state
  - geometry schema init no longer auto-seeds hardcoded ranch/zone/area data
  - area metrics writes require a real persisted area
  - phase creation no longer fabricates preview phases
- owner-only mutation session enforcement is now centralized in `apps/api/src/modules/auth/owner-session.helpers.ts`
- Bakki Core query utilities are now more normalized:
  - `apps/api/src/bakki-core/query-date.utils.ts` now owns shared ISO timestamp/date conversion helpers
  - `apps/api/src/bakki-core/bakki-user-mirror.queries.ts` now owns the shared `bakki_user` select field list and row mapping
- phase helper code is now split by concern:
  - `apps/api/src/modules/phases/phases.service.input.ts`
  - `apps/api/src/modules/phases/phases.service.overview.ts`
  - `apps/api/src/modules/phases/phases.service.wizard.ts`
  - `apps/api/src/modules/phases/phases.service.helpers.ts` is now only a barrel
- shell/operator commands exist for:
  - `yarn doctor`
  - `yarn doctor:strict`
  - `yarn bakki-core:verify`
  - `yarn bakki-core:bootstrap`
  - `yarn odoo:bootstrap`
  - `yarn odoo:sync`
  - `yarn media:probe-signing`
  - `yarn media:probe-upload`
  - `yarn release:check`
- Bakki Core runtime checks now target the managed DigitalOcean cluster from `.env.local`:
  - `yarn bakki-core:db:doctor` reports the remote `bakki-core-fra-20260329` target as reachable
  - `yarn bakki-core:bootstrap --json` applied all 14 migrations and now also promotes the validated ranch/zone seed into the new cluster
  - `yarn bakki-core:verify --json` passes against the new cluster
  - `yarn doctor --json` and `yarn release:check --json` now report partial geometry because the managed DB has `1` ranch, `5` zones, and `0` areas
- local development now uses an explicit `MEDIA_PROVIDER=local-filesystem` setting in `.env.local`, so the stack no longer reports a fake Spaces blocker when hosted bucket secrets are intentionally absent
- backend tests currently pass:
  - `yarn test:api`
  - `73` passing API tests

### Geometry and runtime tooling

- the cleaned ranch/zone seed now passes `yarn seed:geometry:validate`
- the seed generator now also preserves higher WKT precision and validates self-intersections, so valid KML polygons no longer become invalid PostGIS geometry during seed generation
- debug outputs exist:
  - `docs/seeds/geometry-debug.geojson`
  - `docs/seeds/geometry-debug.html`
- local env bootstrap and local Bakki Core DB helper tooling exist
- `yarn bakki-core:db:doctor` now reports the DB target, connection mode, target scope, and TCP reachability explicitly

## Current Frontend Gaps

These are the most important open product issues. The next developer should work from this list first.

### Resolved from the user report

- `The user doesn’t have to login`
  - fixed: the shell is now session-gated and `/login` is real

### Still open

1. Global shell
- sidebar brand/icon still needs a final product-polish check
- button and tool icons still need one consistency pass

2. Map Viewer
- first map paint now lazy-loads the runtime and shows a loading veil instead of a blank interactive surface
- the page no longer carries its own fixture/boilerplate overlay dataset
- overlay spacing and typography still need a final product-polish audit beyond the new top action row

3. Map Management
- first map paint now lazy-loads the runtime and shows a loading veil instead of a blank interactive surface
- selected-area and selected-zone boundary editing now work end-to-end, zone cards now branch into `Edit Areas` and `Create Area`, area-list hover now drives map highlighting, and create-area drafts now finish inside the selected zone; the remaining work is UI polish and responsive cleanup rather than missing lifecycle actions

4. Planting Phases
- the phase map card still needs a final UI pass
- phase cards still need historic detail drill-down:
  - team members
  - contract fulfillment
  - density

5. User Management
- icons are still too small

6. Inventory
- icons are still too small
- the detail card now reserves a real right-hand column on desktop and owns the `Add Stock`, `Update Stock`, and `Edit Species Parameters` actions; final responsive verification still needs checking

7. Task Management
- the create-task modal now uses live area/personnel catalogs and corrected inline icons; broader responsive/polish QA for task surfaces still remains

### Important domain distinction for the next developer

- `zone` = top-level ranch subdivision polygon
- `area` = polygon inside a zone used for contract assignment, density/tree-count tracking, and task linkage

The viewer and management pages now distinguish zone and area selections at the map/runtime level and render separate surfaces for those states. The remaining work is UI polish, responsive cleanup, and the unfinished geometry-editing workflow.

## Runtime Status

Current verified runtime state:

- Odoo reachable and task sync `writeReady: true`
- Odoo credential source: `environment`
- `yarn workspace @bakki/api odoo:bootstrap --json` passed on March 29, 2026 and completed a live write probe:
  - created tagged Odoo probe task `id=11`
  - mirrored the probe task into Bakki Core task mirror `id=1`
  - completed the probe cleanup flow through the `Cancelled` stage
- geometry seed: `promotable: true`
- managed Bakki Core target resolves from `.env.local`
- managed Bakki Core is healthy on the DigitalOcean PostgreSQL/PostGIS cluster `bakki-core-fra-20260329`
- local media provider is `local-filesystem`, so local runtime diagnostics stay green without hosted Spaces secrets
- `yarn bakki-core:verify --json` passes, while `yarn doctor --json` and `yarn release:check --json` now report partial geometry because only ranch/zone rows are loaded

Current verified hosted state as of March 29, 2026:

- DigitalOcean app ingress responds at `https://bakki-admin-llhzr.ondigitalocean.app`
- `GET /api/v1/health` returns `200`
- `GET /api/v1/auth/session` returns `200`
- `GET /api/v1/map/ranch/geometry` returns `1` persisted ranch feature
- `GET /api/v1/map/zones/geometry` returns `5` persisted zone features
- `GET /api/v1/map/viewer` now returns `5` zone overlays and `0` area overlays, matching the managed DB state
- the old broken `GET /api/api/v1/health` path is no longer the required public API entrypoint

Current deployment blockers from `yarn doctor --json`:

- none locally

## Most Relevant Files For The Next Slice

### Frontend auth and shell

- `apps/admin-web/src/router.tsx`
- `apps/admin-web/src/routes/root.tsx`
- `apps/admin-web/src/pages/LoginPage.tsx`
- `apps/admin-web/src/queries/auth.ts`
- `apps/admin-web/src/lib/api.ts`
- `packages/ui/src/index.tsx`
- `packages/domain/src/assets.ts`
- `apps/admin-web/src/prototype/prototype.styles.css`

### Desktop shell

- `apps/admin-desktop/src/main.ts`
- `apps/admin-desktop/src/preload.ts`
- `apps/admin-desktop/src/local-server.ts`
- `apps/admin-desktop/package.json`
- `scripts/run-desktop-dev.mjs`

### Frontend map behavior

- `apps/admin-web/src/hooks/useInteractiveMaps.ts`
- `packages/map/src/index.ts`
- `apps/admin-web/src/pages/MapViewerPage.tsx`
- `apps/admin-web/src/pages/map-viewer.utils.ts`
- `apps/admin-web/src/pages/MapManagementPage.tsx`
- `apps/admin-web/src/pages/map-management.utils.ts`
- `apps/admin-web/src/store/ui.ts`
- `packages/domain/src/fixtures.ts`

### Backend map/data surfaces

- `apps/api/src/modules/map/map.service.ts`
- `apps/api/src/modules/phases/*`
- `apps/api/src/modules/species/*`
- `apps/api/src/modules/tasks/*`
- `apps/api/src/modules/users/*`
- `apps/api/src/modules/dashboard/*`

### Planning docs

- `plan.MD`
- `todo.md`
- `todo-design.md`
- `todo-backend.md`
- `todo-deployment.md`

## Commands Verified Recently

- `yarn workspace @bakki/admin-web typecheck`
- `yarn workspace @bakki/map typecheck`
- `yarn workspace @bakki/admin-web test`
- `yarn workspace @bakki/admin-web build`
- `yarn workspace @bakki/admin-desktop typecheck`
- `yarn workspace @bakki/admin-desktop build`
- `yarn dev:desktop`
- `yarn test:web`
- `lsof -iTCP:5173 -sTCP:LISTEN -n -P`
- `lsof -iTCP:4175 -sTCP:LISTEN -n -P`
- `yarn workspace @bakki/api typecheck`
- `yarn test:api`
- `yarn workspace @bakki/admin-web build`
- `yarn bakki-core:verify --json`
- `yarn bakki-core:bootstrap --json`
- `curl http://127.0.0.1:4175/api/v1/species`
- `curl http://127.0.0.1:4175/api/v1/users`
- `curl -X POST http://127.0.0.1:4175/api/v1/auth/login ...`
- `yarn test:scripts`
- `yarn doctor --json`
- `yarn release:check --json`
- `yarn seed:geometry:validate`
- `yarn bakki-core:db:doctor`
- `curl https://bakki-admin-llhzr.ondigitalocean.app/api/v1/health`
- `curl https://bakki-admin-llhzr.ondigitalocean.app/api/v1/auth/session`
- `curl https://bakki-admin-llhzr.ondigitalocean.app/api/v1/map/ranch/geometry`
- `curl https://bakki-admin-llhzr.ondigitalocean.app/api/v1/map/zones/geometry`
- `curl https://bakki-admin-llhzr.ondigitalocean.app/api/v1/map/viewer`
- `doctl databases list --format ID,Name,Status`
- `doctl apps update 7d2a704c-7c32-465d-8b72-c4e79fb4ecbf --spec /tmp/bakki-app-spec.yaml --wait`
- `docker buildx build --platform linux/amd64 -f apps/api/Dockerfile -t registry.digitalocean.com/bakki-lorenz/bakki-web:api --push .`
- `doctl apps create-deployment 7d2a704c-7c32-465d-8b72-c4e79fb4ecbf --wait`

## Exact Next Steps

1. Fix shell and dashboard parity first:
   - sidebar brand/icon rendering
   - icon scale across the app
2. Fix `Map Viewer` parity:
   - final spacing/typography parity between the new zone-overview and area-detail surfaces
3. Fix `Map Management` parity and functionality:
   - finish the remaining visual/tool parity
   - extend broader zone/area workflows beyond the current selected-area and selected-zone boundary editors
4. Harden the Electron path:
   - packaging/signing workflow
   - final hosted verification for the packaged shell against the deployed DigitalOcean API origin
5. After the frontend/desktop slice, return to hosted runtime completion:
   - persist ranch/zone seed geometry into the managed Bakki Core instance if that remains the intended baseline
   - import real area polygons so `yarn release:check --json` clears the remaining geometry blocker
   - configure real Spaces credentials
   - rerun `yarn media:probe-signing`
   - rerun `yarn media:probe-upload`
   - verify the packaged desktop shell against the deployed API origin
   - rerun `yarn odoo:sync --json`
   - configure Spaces and rerun media probes

## Risks And Blockers

- current `bakki_area` rows are still provisional until real area polygons are imported
- the importer exists, but there are still no real area polygon source files in the repo
- map-management editing is only partially implemented; the next developer should not assume polygon editing is already complete
- the managed Bakki Core cluster is healthy but still has zero persisted ranch/zone/area rows, so release-readiness checks remain blocked on geometry state
- Spaces-backed media verification is still blocked by missing runtime secrets
- `.env.local`, `infra/platform/digitalocean/app.generated.yaml`, and the live App Platform spec now point at the new managed DB endpoint, so those values need to stay aligned on the next DB rotation

## Docs Status

`plan.MD`, `todo.md`, `todo-deployment.md`, and `handoff.md` were updated in this turn and now match the current managed-Bakki-Core rollout state and remaining deployment blockers.
