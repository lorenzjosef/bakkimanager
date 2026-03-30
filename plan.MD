# Bakki Concrete Implementation Plan

## 1. Goal

Build Bakki as a real dynamic product with maintainable routing, typed state, real APIs, and a cohesive Bakki-owned UI system.

Legacy prototype and Figma material are migration references only. The production app should preserve working information architecture and domain workflows where useful, but future UI work is no longer blocked by prototype-parity requirements.

## 2. Locked Decisions

### Architecture

- `Odoo Online SaaS` at `bakki.odoo.com` is part of the system, but it is not the full Bakki database.
- `NestJS` is the only frontend-facing API layer.
- `Bakki Core` uses a dedicated PostgreSQL/PostGIS database and is authoritative for all Bakki-specific domain data.
- `DigitalOcean` hosts the web app, the API, the Bakki Core database, and media storage.
- `Electron` now exists as a first runnable desktop shell with safe-storage-backed local session persistence and hosted-API runtime config, while packaging still comes after browser parity and runtime completion.
- `OpenLayers` is the production map library.

### System of record split

- `Odoo Online` is authoritative for:
  - Odoo account identity
  - Odoo task records
  - Odoo-native stage progression
- `Bakki Core` is authoritative for:
  - ranch, zones, and areas
  - geometry validation and persistence
  - density and tree-count metrics
  - planting phases and per-area contracts
  - monitoring results
  - map audit and privileged audit
  - media metadata and asset references
  - Bakki dashboard aggregates
  - Bakki-side mirrors of Odoo users and tasks

### Simplifications

- Package manager for this repository is `yarn`.
- The baseline styling system is the current shared Bakki CSS, extracted tokens, and shared components, with legacy prototype CSS being reduced over time instead of treated as the visual source of truth.
- `Tailwind` and `Radix` are optional later, not required for the initial product.
- The prototype-route snapshot bridge was a temporary migration tool and is now removed.

### Auth Decision

- `NestJS` owns login, session refresh, logout, and frontend auth contracts.
- `Odoo Online` validates user credentials.
- `Bakki` manages its own session lifecycle after successful login.
- Web auth uses a NestJS-managed session with secure HttpOnly cookie handling.
- Desktop auth uses the same NestJS auth endpoints, but Electron now persists the Bakki session token locally and sends it through a desktop-only request header so packaged apps can authenticate against a hosted DigitalOcean API origin without depending on cross-site cookies.
- `Bakki` does not store recoverable user passwords.
- The earlier owner-visible password feature is replaced by an owner-triggered password reset/regenerate flow.
- Password reset, login, logout, refresh, deactivation, and other privileged auth events are always audited in Bakki.
- NestJS must reject authenticated requests immediately after the corresponding Odoo user becomes inactive.

### User, Task, And Audit Decisions

- Bakki uses only two formal roles in v1: `owner` and `planter`.
- There is no separate helper-account model in v1.
- Bakki stores its own user mirror/profile rows keyed to `odoo_user_id`, not Odoo custom models.
- Bakki tasks are mirrored into a Bakki task table keyed to `odoo_task_id`.
- `bakki.task_template` remains a dedicated Bakki model for instructions, YouTube guidance, checklist schema, and defaults.
- Mobile app delivery is still a future workstream.
- Current repository scope remains web and desktop admin.
- Gather mobile requirements with a structured discovery questionnaire before implementation.
- The frontend must never infer task state from raw Odoo stage names.
- Odoo stage/state remains the external workflow source, and Bakki maps it to:
  - `pending`
  - `in_progress`
  - `done`
  - `cancelled`
- Tasks store a geometry snapshot only.
- Media ownership is split by owner type in v1:
  - observation-owned photos
  - task-owned photos
  - area galleries are derived
- Area staffing during an active planting phase is contract-based:
  - one contracted planter per area
  - one contractual tree-goal per phase-area assignment
- Ranch-level contract reporting now also rolls up beyond individual area assignments:
  - the global ranch contract goal is fixed at `120,000` trees
  - zone contract goals are aggregated from the latest area contract goals inside each zone
  - area tree counts roll up into zone totals, and zone totals roll up into the global ranch total
  - zone fulfillment is allowed to exceed `100%`, and over-fulfilled zones can compensate under-fulfilled zones at ranch level
- Density per 100 square meters is a first-class metric:
  - it must be editable per area
  - it must be shown prominently on map overlays and summary screens
- Monitoring tasks are expected to produce a new area density and optionally a new tree count.
- Planting phases explicitly link to selected areas through a join model.
- Inventory uses a stored running total plus transaction log.
- System-wide privileged and auth events are recorded in a dedicated `bakki_audit_log`.
- Map history for MVP is a simple geometry audit trail, not a draft/publish workflow.

### Mobile App Discovery Questionnaire (For Upcoming Field App Scope)

Use these questions with stakeholders before implementation starts.

#### 1) Users, roles, and access

- Which user roles must use the mobile app on day one (planter, owner, supervisor)?
- Should all owners have full mobile area-creation rights, or only selected owners?
- Do planters need read-only map access, or can they also submit geometry edits?
- Should mobile login use the same Bakki session model and role checks as web/desktop with no separate auth provider?

#### 2) Task management details

- What exact task fields must be visible in the mobile task list (due date, priority, zone, area, checklist, assignee)?
- How should priorities be represented on mobile (labels, colors, sort buckets)?
- What are the default task sort/group rules (due date first, then priority, then area)?
- Are overdue tasks required to be highlighted differently from due-today tasks?
- What task actions are required offline (view only, start, pause, complete, checklist updates, notes, photos)?
- Should users be able to reassign tasks in mobile, or is assignment owner-only from admin?

#### 3) Offline behavior and sync policy

- Which screens must be fully offline-capable (task list, task detail, map, area boundaries)?
- How many days of tasks and map data should be cached on-device?
- What is the conflict-resolution rule when offline edits collide with newer server updates?
- Should sync be automatic on reconnect, manual via a "Sync now" button, or both?
- What status indicators are required for offline/online/sync-pending/sync-failed states?
- Should users be prevented from task completion submission if required fields are missing while offline?

#### 4) Offline map requirements

- Which map layers are mandatory offline (ranch boundary, zones, areas, task-highlighted polygons, basemap tiles)?
- What offline basemap style is preferred (terrain, satellite, hybrid), and what zoom levels are needed?
- Should offline packs be downloaded by ranch, by zone, or by assigned task areas only?
- What is the maximum acceptable offline map storage size per user/device?
- Should map labels and legend behavior match current web/desktop map conventions exactly?

#### 5) GPS capture and owner-led area creation

- For owner area creation, should users capture point sequences, walk boundaries continuously, or both modes?
- What GPS accuracy threshold is required before allowing a point to be saved?
- How many GPS points are required at minimum to create an area polygon?
- Are snapping, simplification, and self-intersection prevention required on-device before submission?
- Should owners be allowed to edit/reorder/delete captured points before finalizing an area?
- Must new areas be validated against parent zone boundaries on-device, server-side, or both?
- Should area creation support draft/save-later workflows when users lose connection mid-capture?

#### 6) Task instructions and media

- Should task templates show embedded YouTube links, downloadable clips, or text-only fallback when offline?
- If YouTube is unavailable offline, should we require pre-downloaded instruction media for critical tasks?
- Are photo attachments required from mobile task completion, and what compression/size limits apply?
- Are there compliance requirements for timestamp, GPS stamp, or user identity on uploaded photos?

#### 7) UX parity and platform expectations

- Which desktop UI patterns are mandatory to mirror on mobile (color system, typography, status chips, map overlay style)?
- Should the mobile app be phone-first only, or also optimized for rugged tablets?
- What minimum Android/iOS OS versions and device performance targets must be supported?
- Which languages/locales are required at launch?
- Are accessibility requirements defined (contrast, text scaling, screen reader labels, touch target sizes)?

#### 8) Security, privacy, and audit

- Are biometric unlock or device PIN re-auth requirements needed for field devices?
- How long can a mobile session remain active offline before re-authentication is required?
- Which mobile actions must be audit-logged in Bakki Core (task state changes, area creation, geometry edits, media upload)?
- Are there data-retention rules for offline cached tasks/maps/media on lost or replaced devices?
- Is remote wipe or forced logout required for revoked users?

#### 9) Notifications and operational workflow

- Are push notifications required for new/changed tasks and approaching due dates?
- Should reminder timing be configurable per user or centrally managed by owners?
- Do owners need a mobile dashboard for team progress, or only admin web/desktop surfaces?
- What field failure cases are highest priority to handle clearly (sync conflicts, GPS drift, invalid geometry, failed uploads)?

#### 10) Release, rollout, and success criteria

- What is the pilot scope (team size, ranch zones, device types, rollout duration)?
- What KPIs define launch success (task completion latency, overdue rate, sync reliability, map usage)?
- Which workflows are mandatory for MVP vs phase 2 (owner area creation, offline media upload, advanced map editing)?
- What training and support materials are required before pilot start?

### Geometry Decision

- Geometry is no longer planned on Odoo.
- Store authoritative geometry in the Bakki Core PostGIS database.
- Serve geometry to the frontend as GeoJSON from NestJS.
- Do not store authoritative geometry only as raw GeoJSON blobs.

### Odoo Online Integration

- Use `bakki.odoo.com` as the Odoo Online base URL.
- Use the Odoo API key currently stored in `API_Keys.txt` as the local-development fallback secret source until secrets are moved into environment configuration.
- Prefer the Odoo 19 `JSON-2` API with bearer-token authentication for service-to-service reads and writes.
- Keep user-credential authentication separate from the service API key flow.
- External API access must be treated as dependent on the Odoo pricing/features available on the `bakki.odoo.com` tenant.

### Feasibility Verification

The architecture has been validated:

- Odoo Online read-side connectivity works via JSON-2 bearer auth
- Odoo Online write-side connectivity works (probe tasks created and stage-advanced)
- Default project `Bakki Operations` provisioned successfully
- Standard task stages provisioned successfully
- Bakki Core PostgreSQL/PostGIS schema is implemented with geometry validation
- DigitalOcean managed PostgreSQL/PostGIS for Bakki Core is provisioned, reachable, and bootstrapped against the current schema
- The local Odoo credential source now resolves from environment configuration instead of the temporary `API_Keys.txt` fallback
- The cleaned ranch/zone seed is now promotable and passes `yarn seed:geometry:validate`

Remaining verification items:

- Configure Spaces runtime secrets and verify media upload
- Persist ranch/zone geometry and import real area polygons into the managed Bakki Core instance
- Import real area polygons when GeoJSON source files are provided
- Confirm Odoo pricing tier includes required external API surface
- Invalid ranch/zone seed geometry is now blocked from Bakki Core promotion by default unless `BAKKI_CORE_ALLOW_INVALID_GEOMETRY_SEED=true` is set intentionally
- Configured environments also no longer serve blocked seed geometry as read-side fallback; without the override, empty persisted geometry is treated honestly instead of silently falling back to the invalid seed

## 3. Repository Shape

Keep this monorepo structure:

- `apps/admin-web`
- `apps/admin-desktop`
- `apps/api`
- `packages/ui`
- `packages/domain`
- `packages/map`
- `infra/platform`
- `docs/`

Notes:

- `odoo/custom_addons/bakki` is now legacy scaffolding from the earlier architecture and is no longer the target production domain model.
- New backend work should target Bakki Core storage and the Odoo Online adapter, not new Odoo custom models.

Current state:

- the real workspace exists
- the real web app exists
- the real Electron desktop shell now also exists, loading the shared frontend through a preload-backed runtime config and a local static renderer server when no dev URL is injected
- the shared shell exists
- all core routes from the legacy prototype migration are native React pages
- utility pages now also exist natively for:
  - general settings
  - Odoo settings
  - notification settings
  - map settings
  - support
- the Odoo settings page now consumes live backend diagnostics for Odoo reachability, Bakki Core health, media provider status, and mirror sync health
- the Odoo settings page and `yarn doctor --json` now also report persisted Bakki Core geometry counts for ranches, zones, and areas
- the Odoo settings page and `yarn doctor --json` now also report whether Odoo service credentials are coming from runtime environment configuration or the temporary `API_Keys.txt` fallback
- the Odoo settings page and `yarn doctor --json` now also expose an explicit ordered deployment-blocker list derived from Odoo reachability, secret source, Bakki Core health, geometry state, media config, and mirror retry state
- the Odoo settings page and `yarn doctor --json` now also expose backend-derived recommended remediation actions, so shell and UI point operators at the same next steps and commands
- the Odoo settings page and `yarn doctor` now also expose the resolved Bakki Core endpoint plus PostgreSQL version, PostGIS status, and migration-table state when the database is reachable
- a direct DB-level Bakki Core verification path now also exists via `yarn bakki-core:verify`, so operators can check raw DB connectivity, PostGIS presence, migrations, and geometry-table presence without booting the Nest app
- reachable-but-misprovisioned Bakki Core states now surface as explicit diagnostics blockers too, so a running PostgreSQL instance without PostGIS or without initialized Bakki Core migrations no longer looks deployment-ready
- shared helpers now also own the repeated map geometry mutation fallback/audit flow plus the repeated Bakki geometry ranch/zone/area read-side SQL shapes, so future geometry contract changes are less likely to drift across duplicated service code
- the Odoo settings page and `yarn doctor --json` now also surface live Open-Meteo weather-feed diagnostics for the dashboard conditions provider without treating weather failures as deployment blockers
- deployment blockers now gate persisted-geometry warnings behind a healthy Bakki Core state, so diagnostics no longer claim missing persisted geometry while PostgreSQL/PostGIS is still unconfigured or unhealthy
- the doctor path now also tolerates a configured-but-unreachable Bakki Core database and degrades to blocker diagnostics instead of crashing, so local/staging operator checks remain usable while PostgreSQL/PostGIS is down
- the geometry seed toolchain now also exports:
  - `docs/seeds/geometry-debug.geojson` via `yarn seed:geometry:debug`
  - `docs/seeds/geometry-debug.html` via `yarn seed:geometry:view`
- the ranch and zone KML has now been cleaned up so `yarn seed:geometry:validate` passes, and the same debug artifacts remain available for future geometry review without requiring a separate GIS tool
- direct script-level regression coverage now also exists for the geometry seed summary, successful validation mode, failing invalid-KML validation mode, and debug artifact generation, so the cleaned ranch/zone KML no longer depends on manual spot checks alone
- the local Bakki Core DB helper scripts now run through a checked wrapper, so `yarn bakki-core:db:doctor` and `yarn bakki-core:db:up` report missing Docker or env-file prerequisites explicitly instead of failing with a raw compose error
- the managed Bakki Core runtime is now provisioned and wired into this workspace:
  - `.env.local` now points at the managed DigitalOcean PostgreSQL/PostGIS cluster
  - `yarn bakki-core:bootstrap --json` bootstraps the managed `bakki_core` database cleanly and now promotes the validated ranch/zone seed
  - `yarn bakki-core:verify --json` passes against the managed cluster
  - `yarn doctor --json` and `yarn release:check --json` now report partial geometry because the managed DB has persisted ranch/zone rows but still no area rows
- the first DigitalOcean App Platform deployment is now live at `https://bakki-admin-llhzr.ondigitalocean.app`, and hosted `GET /api/v1/health` plus `GET /api/v1/auth/session` were re-verified on March 29, 2026 after aligning the API default prefix with the `/api` ingress contract
- the managed DigitalOcean Bakki Core cluster was replaced on March 29, 2026, and both local `.env.local` plus the hosted app runtime now point at the new PostgreSQL/PostGIS endpoint
- `yarn doctor:strict` now exits non-zero whenever deployment blockers are present, so the same diagnostics can be used as an operational gate in CI or deployment scripts
- a direct aggregated release-readiness gate now also exists via `yarn release:check`, which combines runtime diagnostics, direct Bakki Core verification, the web bundle guard, and geometry-seed promotability into one operator-facing pass/fail report
- the local Bakki Core DB wrapper now distinguishes local vs remote DB targets, so `yarn bakki-core:db:doctor` only treats Docker as a blocker for local targets and `yarn bakki-core:db:up/down/logs` now stop immediately when the configured Bakki Core target is remote
- tabular Bakki Core migration helpers now also exist under `migrate/`:
  - `yarn bakki-core:export-import-templates` writes CSV templates for `bakki_area_metrics` and `bakki_species`
  - `yarn bakki-core:import-area-metrics` imports current per-area tree-count/density state from CSV
  - `yarn bakki-core:import-species-inventory` imports current species inventory state from CSV
  - these imports set current state only; they do not recreate historic inventory transactions or observation history
- the Odoo settings page now also exposes an owner-triggered Bakki Core migration action so the database schema can be initialized from the app once PostgreSQL/PostGIS credentials are present
- the Odoo settings page now also exposes an owner-triggered Bakki Core bootstrap action so migrations plus initial geometry/templates/species/area-metric seed data can be initialized from the app once PostgreSQL/PostGIS credentials are present
- Bakki Core bootstrap results now also surface geometry-seed promotability so invalid ranch/zone topology stays visible in both shell and settings flows
- the Odoo settings page now also exposes task-sync write-readiness diagnostics based on the live default project and standard task-stage mapping
- the Odoo settings page `Sync Now` action is now real and owner-gated, refreshing Odoo users and recent tasks into Bakki mirrors without mutating the tenant
- shared React Query keys now back the cross-page settings/bootstrap invalidation paths, so Bakki Core migration/bootstrap refreshes the real map, geometry, species, phase, user, task, and dashboard caches instead of stale or misspelled keys
- the generic React Query invalidation executor now also lives in a single shared helper with a direct unit test, so settings and domain mutations cannot drift on the actual invalidation call path
- the settings mutation invalidation sets now also live in a small shared helper with direct frontend tests, so cache-refresh regressions no longer depend on reading the hook bodies manually
- the remaining task/map/species/user/phase mutation invalidation sets now also live in a shared helper with direct frontend tests, so cache-refresh behavior is no longer scattered through individual query hooks
- task creation invalidation now also refreshes the dashboard summary, and phase creation invalidation now also refreshes dashboard plus map contract surfaces, so those cross-page task/phase mutations no longer leave stale program or contract UI behind
- user-status updates now also invalidate the auth-session query, so self-deactivation or self-reactivation cannot leave stale owner session state in the shell for the query stale-time window
- task and user mutations that touch Bakki mirrors now also invalidate Odoo diagnostics, so the settings page mirror-health cards no longer stay stale after create/workflow/status actions
- the dashboard biodiversity card now uses live Bakki species counts when Bakki Core is configured and otherwise keeps the baseline dashboard summary until Bakki species persistence is available, and species creation now refreshes the dashboard so that metric no longer stays fixture-only
- the dashboard biodiversity stack badge now derives from the same live species count instead of staying fixture-only, so the whole biodiversity card stays internally consistent
- the dashboard coordinate readout now uses the ranch geometry centroid from Bakki Core when available and reports `Unavailable` when configured geometry cannot provide a persisted ranch centroid, so that card no longer stays hardcoded or silently retains stale fixture coordinates
- the dashboard greeting now prefers the authenticated session user's first name on the client side and falls back to the summary value only when no session is available, so authenticated users no longer see the stale fixture greeting
- the dashboard now also reports `0 Active Zones` and `0` active species honestly when Bakki Core is configured but those persisted datasets are empty, instead of silently keeping fixture counts
- the dashboard now also clears fixture program-of-day rows when live task sources return no work, and the active-phase card now reports `No active planting phase`, `0%`, and `0 trees` honestly when Bakki Core is configured but there is no active phase or no fulfillment data yet
- the dashboard conditions card now uses live Open-Meteo current conditions at the ranch centroid and reports `Unavailable` / `Weather feed unavailable` honestly when the weather feed cannot be resolved, so the remaining homepage metric card is no longer fixture-only
- the Odoo settings page now also exposes an owner-triggered write-side task probe that can create a clearly tagged Odoo task, sync it into Bakki, and advance it through standard stages for controlled verification
- the Odoo settings page now also exposes an owner-triggered provisioning action that can create the default Odoo project and any missing standard task stages needed for Bakki task sync
- the Odoo settings page now also exposes a non-destructive Spaces signing probe that generates a real presigned upload URL and performs a bucket reachability check without persisting media metadata
- the Odoo settings page now also exposes a full end-to-end media upload probe that performs a signed upload of a tiny probe file, verifies it via signed HEAD, and attempts cleanup without creating Bakki media metadata
- a direct shell bootstrap path now also exists via `yarn odoo:bootstrap`, which provisions Odoo task-sync prerequisites and runs the write probe without going through the settings UI
- a direct shell mirror-refresh path now also exists via `yarn odoo:sync`, which refreshes Odoo users and tasks into Bakki mirrors without going through the settings UI
- a direct shell Bakki Core bootstrap path now also exists via `yarn bakki-core:bootstrap`, which runs Bakki Core migrations plus initial seed initialization without going through the settings UI
- a direct shell runtime-doctor path now also exists via `yarn doctor`, which reports live Odoo reachability, task-sync readiness, Bakki Core config status, geometry-seed promotability, media config status, and current mirror health without going through the settings UI
- local development can now also opt into an explicit `local-filesystem` media provider so the local stack no longer reports a fake Spaces blocker when DigitalOcean bucket secrets are intentionally absent; hosted environments should continue using Spaces
- the geometry seed toolchain now also guards against self-intersecting zone polygons and preserves higher WKT precision, so seed generation no longer produces invalid PostGIS geometry from valid source KML
- direct shell media probe paths now also exist via:
  - `yarn media:probe-signing`
  - `yarn media:probe-upload`
- live read-side connectivity to `bakki.odoo.com` has now been verified against the Odoo 19 JSON-2 API using the configured API key
- live write-side Odoo verification has now also been exercised against `bakki.odoo.com`:
  - `Bakki Operations` was provisioned as the default Odoo project
  - a missing `In Progress` stage was provisioned
  - tagged probe tasks were successfully created and moved through standard stages
- the runtime prototype snapshot bridge has been removed
- the shared UI primitives exist in `packages/ui`, including runtime state shells
- the shared UI layer now also owns the reusable settings controls previously embedded inside `SystemSettingsPage`, including settings read-only fields, toggle rows/switches, layer chips, section rows, and settings panel cards
- the shared UI layer now also owns the reusable support utility surfaces for the support status bar and support action cards
- the shared UI layer now also owns the reusable map overlay shell pieces for the live map pages, including the overlay panel wrapper, overlay header, and two-card density/contract summary block
- route pages now load lazily from the router instead of shipping in one eager application bundle
- the global task-creation modal is now split behind an open-state gate instead of loading in the initial shell bundle
- the web shell now requires a real authenticated session:
  - preview auto-login bootstrap is removed
  - `/login` is a real route
  - non-login routes are session-gated
  - shell sign-out is wired
- runtime prototype asset variables are now applied during web bootstrap, so the sidebar brand mark, dashboard forest/map cards, owner avatar, and species chips can render real local assets instead of empty fallback gradients
- the shell brand mark, owner avatar, and dashboard forest / zones-map surfaces now also bind their local assets directly in component render paths, so those surfaces no longer depend only on root CSS variable hydration
- generated local glyph-based asset icons now render larger and more centrally, reducing button/tool icon drift across map, task, and utility surfaces
- the dashboard map cards now also render a fallback geometry silhouette when live geometry queries are unavailable, so the homepage map surfaces still read as maps in preview mode instead of empty cards
- `Map Viewer` and `Map Management` are no longer hardcoded to `zone-3`:
  - viewer overlays now exist for all seeded zones
  - the OpenLayers instance updates vector sources in place instead of being destroyed and recreated as geometry queries resolve
- map viewer and management fixtures now also render as pending-state placeholders during the initial fetch, so those pages can paint immediately instead of blocking on the first live response
- map viewer and management overlays now stay hidden until the user explicitly clicks a zone or area on the map instead of auto-opening on mount
- map-management tools now drive real selection-mode and layer-visibility behavior:
  - `zone`
  - `area`
  - ranch visibility
  - zone visibility
  - area visibility
- the shared map/runtime selection contract now distinguishes `zone` clicks from `area` clicks, and selected areas are highlighted independently from their parent zones
- `Map Viewer` now renders separate zone-overview and area-detail surfaces instead of forcing both states through one blended area card
- `Map Management` now renders a zone overview separately from the editable area-metrics editor, so zone selection no longer pretends to be an active area edit
- both live map overlays now use a prototype-shaped section order again, removing the extra context and density-summary chrome that had drifted away from the approved card geometry
- both live map pages now use inline SVG controls for close/actions/tool buttons instead of fixed-color glyph assets, so active/inactive control states can follow the prototype color treatment again
- the `Map Management` layer-stack button now also toggles the legend card and the legend rows reflect current layer/selection state, so that control cluster is no longer static decoration
- the late overlay-height override now uses max-height instead of a forced bottom anchor, so scrollable live map cards no longer fight the prototype’s smaller-screen docking rules
- the shared `useInteractiveMaps` hook now lazy-loads the `@bakki/map` runtime and both live map pages render an explicit runtime-loading veil while the interactive terrain/geometry surface boots, improving perceived first paint after route navigation
- `Map Management` now also supports a real selected-area boundary edit/save flow:
  - the pen tool opens a live vertex-drag edit session for the selected area on the OpenLayers map
  - the properties card reflects draft boundary coordinates while editing
  - geometry saves go through a new `PATCH /map/areas/:areaId/geometry` path
  - when Bakki Core geometry persistence is unreachable, the API now returns an honest unavailable error instead of silently writing preview data
- `Map Management` now also supports a real selected-zone boundary edit/save flow:
  - the pen tool opens a live vertex-drag edit session for the selected zone on the OpenLayers map
  - zone geometry saves go through a new `PATCH /map/zones/:zoneId/geometry` path
  - Bakki Core-backed zone writes now validate ranch containment, sibling-zone overlap, and child-area coverage before persisting
  - when Bakki Core geometry persistence is unreachable, the API now returns an honest unavailable error instead of silently writing preview data
- `Map Management` now also supports live Bakki Core area lifecycle actions:
  - zone selection now lands on a dedicated `Zone Info` card with explicit `Add Area` and `Edit Areas` actions plus zone-boundary editing
  - the `Edit Areas` card now lists all areas in the selected zone and drives hover-highlighting on the map through the shared runtime
  - the `Create Area` card now starts from a true map-drawn polygon draft instead of copying the whole zone geometry first
  - area selection can rename the area, update metrics, refine geometry, and delete the area from a dedicated `Edit Area` card with back-navigation to the area list
  - the management payload now carries area-specific detail records by area id, so multi-area zones no longer collapse back to one synthetic “editable area” record
- `Map Management` control ownership is now also moving back toward the prototype:
  - ranch, zone, and area visibility toggles now live in the legend rows
  - the pen tool enters boundary editing for the selected zone or area
  - the polygon tool resets a dirty boundary draft
  - the node tool exits or discards the current boundary edit session
- the `Map Management` route now keeps page orchestration in the route component while the static map chrome and properties overlay live in dedicated section components, reducing route-level JSX sprawl without changing the approved UI
- the idle area-detail footer in `Map Management` now returns directly to the zone summary and keeps save disabled until density, tree-count, or boundary geometry actually changes, so the tool stack remains the only edit-entry path
- the shared OpenLayers runtime now also applies live hover treatment for both zones and areas, including cursor feedback and parent-zone hover when an area is under the pointer, so the map surfaces no longer feel static before selection
- the zone-selection card in `Map Management` now restores the management summary block with live density, fulfillment, tree-count, and planter values, so zone selection no longer reads like a geometry-only debug card
- the `Map Viewer` area-detail footer now hands the active area off into `Map Management`, preserving zone/area context across the route change so `Edit Area Geometry` is no longer a dead-end action
- the `Map Viewer` ranch and zones pills now drive real read-only layer visibility in the shared runtime, and the legend now reflects hidden layers plus area-vs-zone focus state instead of staying static
- the dedicated `Map Viewer` fixture dataset is now removed from the domain layer; `/map/viewer` now derives zone and area overlays from the shared ranch/zone/area, contract, and metrics structures and returns honest empty state when live detail records are missing
- the shared local asset layer now also provides richer forest and terrain surfaces for the dashboard hero cards, so `phase-card-forest` and `zones-map` no longer render as generic preview gradients
- the live map overlays now anchor to the top-right edge of the map surface and scroll internally when their content outgrows the viewport, so the cards stay usable on shorter screens
- the planting-phase timeline cards now surface the contract-fulfillment and density summary directly on each clickable card, so completed phases expose their key area metrics before the detail panel opens
- `Task Management` and `Planting Phases` now also return honest empty live states when the configured task or phase backends have no records, instead of reusing canned fixture history in a live-empty scenario
- `Planting Phases` overview and wizard no longer use fixture-backed queries, preview banners, or fixture-merged backend payloads; both routes now hydrate only from the shared phase data structures returned by `/phases/overview` and `/phases/wizard`
- `User Management` no longer uses a fixture-backed query, preview banner, or preview-user mutation path; the page now hydrates solely from `/users/management`, and backend user actions return honest unavailable errors instead of fabricating preview personnel
- `Task Management` no longer uses a fixture-backed summary query, preview banner, preview task mutation path, or runtime task-template fallback; the page now hydrates solely from `/tasks/summary` and `/tasks/templates`, with honest unavailable states when live task backends are down
- `Species Management` no longer uses a fixture-backed query, preview banner, preview-species store, or fixture-derived detail payload; the page now hydrates solely from `/species` and `/species/:id`, while live writes return honest unavailable errors when Bakki Core is down
- the non-interactive map preview cards now use static image assets again on the dashboard, planting-phase overview, and task-management surfaces, so those modules no longer depend on live geometry thumbnail rendering
- the species management detail view now renders as a true flyout overlay again instead of reading like a stacked under-card panel
- a direct shell bundle guard now also exists via `yarn web:bundle:check`, which verifies the entry chunk stays below the configured limit and that expected lazy route/modal chunks are still emitted
- the web bundle guard analysis now also lives in a small shared script helper with direct regression coverage via `yarn test:scripts`, so the guard logic can be tested without rebuilding the whole app
- initial frontend unit coverage now exists for:
  - Odoo settings diagnostics helper logic
  - dashboard render-state and preview-banner logic
  - map-management render-state and preview-banner logic
  - phase-overview render-state logic
  - planting-wizard render-state logic
  - species-inventory render-state logic
  - routed-shell title/nav/utility derivation
  - settings page variant/tab/operator-label helpers
  - shared settings utility controls
  - shared support utility surfaces
  - shared map overlay shell pieces
  - map-viewer overlay selection, live gallery handling, and upload-gating logic
  - task creation modal option mapping, payload shaping, and area-context handling
  - planting wizard readiness and create-phase payload shaping
  - species-inventory mutation payload/validation and render-state logic
  - task-management workflow/action helper logic
  - task-management render-state and preview-banner logic
  - task-management monitoring-result modal payload and validation logic
  - map-management area-metrics draft normalization and payload validation
  - user-management onboarding/reset/status and render-state logic
  - role-driven user-permissions fixture shaping
  - planting-wizard draft-store hydration and contract assignment behavior
  - settings mutation invalidation sets for Odoo sync, Bakki Core migration/bootstrap, task-sync probes, and media probes
  - task/map/species/user/phase mutation invalidation sets
- the NestJS API scaffold exists with an Odoo integration boundary and fallback services
- the Odoo client now defaults to `https://bakki.odoo.com` and `bakki`, uses the Odoo API key as the local-development service secret fallback, and supports Odoo 19 JSON-2 for the common ORM calls already used by the API layer
- a first Bakki Core database boundary now exists in `apps/api/src/bakki-core` with environment-driven PostgreSQL configuration and a shared `pg` pool service
- Bakki Core schema bootstrap now guards concurrent `ensureSchema()` calls across the services and clears failed init promises so later requests can retry cleanly instead of racing or getting stuck behind a rejected promise
- Bakki Core-backed user mirrors now exist and power the live `auth` and `users` paths instead of `bakki.user_profile`
- Bakki Core-backed task mirrors now exist and are populated from task read/write flows in `tasks.service`
- Bakki Core-backed user and task mirrors now track sync status, sync error text, retry count, and last sync-attempt timestamps
- Bakki Core-backed task mirrors now preserve a geometry snapshot captured from the authoritative area geometry catalog at task creation time
- a Bakki Core-backed `bakki_task_template` catalog now exists and task creation/template selection no longer depends on a hardcoded frontend-only type list
- Bakki Core-backed planting phase tables now exist and power the live phase overview/create path instead of `bakki.user_profile`, `bakki.phase_participant`, and `bakki.phase_area`
- Bakki Core-backed area metrics and observations now exist and power live map density/tree-count updates and monitoring-result persistence
- Bakki Core-backed task mirrors now hold authoritative `area_ref` linkage for Bakki task flows instead of relying on custom Odoo area fields
- Bakki Core-backed geometry tables now exist for `bakki_ranch`, `bakki_zone`, and `bakki_area`
- ranch and zone seed artifacts now live in `docs/seeds/geometry-seed.json`, and Bakki Core bootstrap now promotes them into persisted geometry when the seed is valid
- ranch, zone, and area hectare values are now derived from geometry in the database instead of trusted as seed literals
- the map API now serves ranch, zone, and area geometry as GeoJSON from NestJS
- the OpenLayers renderer now prefers API-served ranch, zone, and area GeoJSON and falls back to local KML in development
- Bakki Core-backed media metadata tables now exist for task and observation photos, and the media API no longer depends on legacy Odoo photo models
- Bakki Core-backed species and inventory tables now exist, and the live species CRUD/inventory flows prefer Bakki Core when configured
- Bakki Core-backed map-audit persistence now exists, and map metric changes are recorded separately from the privileged audit log
- Bakki Core write paths now explicitly fail when `returning` clauses produce no row instead of silently dereferencing `undefined`
- canonical Bakki Core area rows are now seeded for each current contract area using the current zone geometry as the provisional area boundary
- a Bakki Core GeoJSON area-import path now exists via `yarn bakki-core:import-areas --file path/to/areas.geojson [--dry-run]`
- Bakki Core now enforces area-within-zone and sibling non-overlap validation at the database layer for `bakki_area`
- Bakki Core `area_ref` integrity is now enforced across phase contracts, task mirrors, area metrics, and observations
- a formal Bakki Core migration runner now exists at `scripts/migrate-bakki-core.cjs` with the first SQL migration under `apps/api/src/bakki-core/migrations/`
- all current live-query pages have explicit loading, empty, warning, and error handling
- the live auth flow now uses owner-triggered password reset/regenerate instead of reveal/copy
- auth and user sync now request `res.users.group_ids` instead of the invalid `groups_id` field, removing the current Odoo tenant field mismatch that was breaking live auth/user reads
- live Odoo credential login now degrades to an Odoo-derived session when Bakki Core user-mirror persistence is configured but currently unreachable, so valid local logins no longer fail with a generic internal server error just because PostgreSQL is down
- species list/detail reads now translate Bakki Core connectivity failures into explicit service-unavailable responses, so the frontend species page falls back with a clear blocker message instead of a generic internal error
- in-memory auth sessions now opportunistically prune expired entries, and preview fallback task state is now bounded so local preview mode cannot grow those collections without limit
- the app currently still contains legacy assumptions mainly around provisional area geometry and external verification gaps
- the remaining legacy service fallbacks to custom Odoo Bakki models have been removed from live auth/users/phases/map/monitoring/species paths
- the Odoo task adapter now maps standard Odoo stage names to Bakki workflow states and infers task type from Bakki mirrors/templates first, with title-based fallback when needed
- the next implementation focus is migration, not fresh page building
- the current local runtime is still missing Bakki Core and Spaces environment configuration, so:
  - Odoo mirrors are not being persisted locally
  - local Odoo login can still establish an in-memory Odoo-derived session, but mirror-backed reset/write flows remain blocked until Bakki Core is reachable
  - media probes stop at configuration diagnostics
  - local settings diagnostics now report those gaps explicitly instead of overstating success
- a root `.env.example` now exists with the current runtime keys for:
  - Odoo Online
  - Bakki Core PostgreSQL/PostGIS
  - DigitalOcean Spaces
  - Vite API base URL
- API dev/start/import scripts now load repo-root `.env` and `.env.local` automatically
- Vite now reads repo-root env files via `envDir`, so `VITE_API_BASE_URL` can be configured once at the repo root
- a local env bootstrap script now exists at `scripts/init-local-env.mjs` and is exposed as `yarn env:init-local`
- a repeatable ranch/zone seed validation command now exists as `yarn seed:geometry:validate`
- a repeatable ranch/zone seed inspection command now also exists as `yarn seed:geometry:inspect`
- a local PostGIS dev stack now exists at `infra/platform/docker-compose.local.yml` and is exposed via:
  - `yarn bakki-core:db:up`
  - `yarn bakki-core:db:down`
  - `yarn bakki-core:db:logs`
- the Bakki Core migration path is now exposed both:
  - in the shell via `yarn bakki-core:migrate`
  - in the settings UI via `POST /api/v1/health/bakki-core/migrate`
- the Bakki Core bootstrap path is now exposed in the settings UI via `POST /api/v1/health/bakki-core/bootstrap`
- the Bakki Core bootstrap path is now also exposed in the shell via `yarn bakki-core:bootstrap`
- Odoo mirror refresh is now also exposed in the shell via `yarn odoo:sync`
- runtime diagnostics are now also exposed in the shell via `yarn doctor`
- media signing/upload probes are now also exposed in the shell via `yarn media:probe-signing` and `yarn media:probe-upload`
- initial API unit coverage now exists for:
  - Odoo task-mapping heuristics
  - Bakki Core config resolution
  - health diagnostics
  - Bakki Core bootstrap/migration gating
  - Odoo mirror sync behavior
  - Odoo task-sync provisioning and write-probe flows

## 4. Implementation Sequence

### Phase 0. Reference Lock

Completed:

- `prototype/` is frozen as the visual source of truth
- backup exists in `backups/prototype-20260327-201602/prototype/`
- if prototype and Figma disagree, the prototype wins
- `design.md` exists and is binding

### Phase 1. Foundation

Completed:

- workspace scaffold
- shared TypeScript config
- `admin-web`, `admin-desktop`, `api`, `ui`, `domain`, `map`, and `infra` skeletons
- React app shell
- routing foundation
- Zustand and TanStack Query setup
- OpenLayers map foundation

### Phase 2. Native Page Conversion

Completed:

- `Dashboard`
- `User Management`
- `Species`
- `Task Management`
- `Planting Phases` overview
- planting wizard pages
- `Map Viewer`
- `Map Management`
- `System Settings`
- `Support`

### Phase 3. Shared UI Extraction

Completed:

- buttons
- card shells
- table wrappers
- form rows and grouped form sections
- split detail layouts
- explicit loading, empty, warning, and error state shells
- status chips
- wizard shell pieces
- density-summary cards
- map overlay containers
- repeated settings/support utility surfaces

### Phase 4. Backend Migration To Odoo Online + Bakki Core

Implemented so far:

1. replaced the old self-hosted Odoo assumptions in auth, user, and task layers
2. added the Bakki Core database configuration and persistence boundary
3. migrated user ownership to Bakki Core mirrors keyed by `odoo_user_id`
4. migrated task ownership to Bakki Core mirrors keyed by `odoo_task_id`
5. migrated phase, metrics, media, species, audit, and geometry persistence onto Bakki Core
6. replaced credential reveal/copy with password reset/regenerate
7. kept Odoo Online as the external system for user/task sync
8. added an owner-triggered mirror refresh path for Odoo users and recent tasks via the settings page
9. added a controlled owner-triggered Odoo write probe path for task-sync verification and exercised it successfully against the live tenant in this repository session
10. added a direct shell bootstrap command, `yarn odoo:bootstrap`, which now provisions and verifies the Odoo task-sync baseline outside the settings UI
11. added a non-destructive media signing probe path for Spaces verification, but it has not been executed against the live bucket in this repository session
12. added a full end-to-end Spaces upload probe path with verification and cleanup, but it has not been executed against the live bucket in this repository session
13. removed the preview auto-login bootstrap from the web shell and added a real `/login` route with session-gated shell access
14. restored the runtime prototype asset variables in the web bootstrap so sidebar/dashboard visual surfaces no longer depend on CSS fallback gradients
15. removed the `zone-3`-only map overlay path:
    - all current viewer overlays now exist for all seeded zones
    - OpenLayers sources now update in place instead of destroying/recreating the map as geometry queries settle
16. map management tools now drive real selection-mode and layer-visibility behavior instead of being inert buttons
17. the live map selection contract now distinguishes zone and area hits, area polygons now highlight independently, and both map pages render separate zone and area surfaces instead of one blended overlay
18. map viewer and management now use fixture-backed pending placeholders for the initial fetch, reducing the first-render block before live map data arrives
19. map viewer and management cards now stay hidden until an explicit zone or area click, use prototype-native floating overlay markup again, and keep long dynamic content scrollable inside the card body instead of stretching into a full-height drawer

Still to finish:

1. tighten shell parity:
   - sidebar brand icon visibility
   - shared icon sizing vs the prototype
2. finish `Map Viewer` parity:
   - final spacing and typography audit against the prototype
3. finish `Map Management` parity and functionality:
   - finish the remaining visual/tool parity
   - extend broader zone/area workflows beyond the current selected-area and selected-zone boundary editors
4. add the remaining missing prototype surface:
   - planting-phase historic detail view
5. replace provisional Bakki Core area geometry with imported real area polygons once they exist
6. verify the Spaces media path end to end

### Phase 5. Odoo Online Adapter

Implement:

- Odoo Online service client using `bakki.odoo.com`
- API-key-backed service operations
- user credential validation path
- user sync
- task sync
- stage-to-workflow mapping
- sync status/error handling

### Phase 6. Bakki Core Persistence

Implement in the dedicated Postgres/PostGIS database:

- ranch, zone, area geometry
- planting phases
- phase-area contracts
- Bakki user mirror/profile
- Bakki task mirror
- observations
- species and inventory
- audit
- map audit
- media metadata

### Phase 7. QA And Deployment

- verify Odoo Online API access and sync behavior against `bakki.odoo.com`
- verify Spaces-backed upload/finalize end to end
- verify routed pages for UI consistency, responsive behavior, and honest live-data states
- extend the Electron wrapper with packaging/signing and final hosted verification
- finish DigitalOcean deployment assets

## 5. Current Priorities

1. close the current frontend polish and workflow gaps called out in the latest user review:
   - shell icon sizing and sidebar brand/icon rendering
   - `Map Viewer` polish and performance cleanup
   - `Map Management` workflow hardening and UI cleanup
2. harden the Electron desktop path:
   - packaging/signing workflow
   - final hosted verification against the deployed DigitalOcean API origin
3. configure Spaces for hosted environments and rerun:
   - `yarn media:probe-signing --json`
   - `yarn media:probe-upload --json`
4. import real area polygons into Bakki Core to replace the provisional canonical area geometry
5. run the UI consistency pass and release QA
