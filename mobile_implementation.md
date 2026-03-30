# Bakki Mobile Implementation Plan

## Problem statement

Implement a production-ready mobile field app for iOS and Android that supports field-critical workflows only: offline-ready personal task visibility, offline ranch/area map visibility, and owner-only offline area capture with later sync and desktop review.

This plan aligns with current locked architecture:
- React Native app added to the monorepo (`apps/mobile`)
- Existing NestJS API remains the only backend entrypoint
- Odoo remains identity/task source where applicable
- Bakki Core (PostGIS) remains authoritative for geometry and Bakki domain persistence
- Frontend clients never call Odoo directly

## Scope boundaries (v1)

In scope:
- Login/session for mobile users
- Multi-day offline usability after login
- Task list and task detail as read-only
- Offline map viewing for ranch/zones/areas
- Owner-only area draft capture offline (boundary walk + point-by-point)
- Sync of mobile area drafts when online
- Desktop visibility/review of pending drafts
- Pending draft availability in planting phase wizard selection

Out of scope:
- Task editing/completion from mobile
- Evidence/photo capture
- Mobile planting phase creation
- Any planter write-path

## Technical approach

### 1) Monorepo structure

Create:
- `apps/mobile` (React Native)
- `packages/mobile-offline` (offline cache, sync queue, conflict handling)

Reuse:
- `packages/domain` (shared types/contracts)
- existing API contracts and auth model
- existing design tokens/visual language

Do not reuse directly:
- `packages/ui` rendering (web/desktop specific)
- `packages/map` OpenLayers runtime (web specific)

### 2) Mobile map stack

Use `react-native-maps` for native iOS/Android rendering.

Reuse geometry/data contracts:
- GeoJSON types from `@bakki/domain`
- shared area/zone/ranch identifiers
- shared validation semantics

### 3) Backend integration model

Use existing auth/session behavior with header transport:
- `x-bakki-session`
- `x-bakki-client: mobile`

Add mobile-focused API surfaces for efficient offline bootstrap and sync.

## Execution phases

## Phase 0 — Foundation and repo wiring

Deliverables:
- Add `apps/mobile` workspace package and scripts
- Add base React Native runtime and TypeScript config aligned with monorepo
- Add shared environment config (`API base URL`, app version, build channel)
- Add mobile CI checks (typecheck/lint/test where already supported)

Acceptance criteria:
- `apps/mobile` builds and launches on iOS + Android dev targets
- app can import and compile against `@bakki/domain`

## Phase 1 — Mobile auth and session lifecycle

Deliverables:
- Login screen and auth flow using existing NestJS auth endpoints
- Session storage with secure local persistence
- Session refresh/logout support
- Auth gating by `mobileAccessEnabled` and role (`owner`, `planter`)
- Offline startup behavior when prior session exists

Acceptance criteria:
- Valid users can sign in and restore session after app restart
- Users without mobile access are blocked with explicit error
- App remains usable offline with a previously valid session within policy window

## Phase 2 — Offline bootstrap and local data store

Deliverables:
- `packages/mobile-offline` with:
  - normalized local entities (user, tasks, ranch/zones/areas, draft areas)
  - sync metadata (last sync time, stale flags, sync status)
  - mutation queue for owner draft area sync
- bootstrap sync on login (tasks + map + profile/permissions)
- stale/offline state indicators throughout app

Acceptance criteria:
- First online login caches required v1 data
- App loads cached data without network
- Users can clearly see offline/stale status

## Phase 3 — Read-only task workflows

Deliverables:
- Tasks tab: list, search/sort/filter (due date, priority)
- Task detail screen: read-only operational details
- Role-safe UI (no write actions for planters; no task mutation for owners either in v1)

Acceptance criteria:
- Task data fully available from cache offline
- No task mutation paths exposed

## Phase 4 — Offline map viewer

Deliverables:
- Map tab with ranch/zone/area rendering from cached geometry
- Relevant area highlighting for user context
- Area detail panel with key metrics and metadata
- Base map tile caching strategy for offline operation in relevant operating bounds

Acceptance criteria:
- Ranch/zones/areas visible offline after initial cache
- Map remains performant for current ranch geometry volume
- Clear indication when map data is stale vs fresh

## Phase 5 — Owner offline area capture

Deliverables:
- Owner-only capture flow:
  - boundary walk mode
  - point-by-point mode
- GPS accuracy display and minimum-point guard
- Geometry validation pre-save (simple self-crossing and min-shape checks on device)
- Local draft persistence with name + raw points + metadata

Acceptance criteria:
- Owner can create and save drafts fully offline
- Invalid geometry paths are blocked with explicit errors
- Drafts appear immediately in owner’s local Areas view with status

## Phase 6 — Draft sync and backend draft model

Deliverables:
- Backend migration for `bakki_area_draft` (or equivalent server-side draft table)
- Mobile sync endpoint(s): batch push queued drafts and return per-item results
- Server-side validation:
  - contained in zone
  - no sibling overlap
  - valid polygon constraints
- Deterministic sync states:
  - local
  - queued
  - synced/pending-review
  - failed
  - rejected

Acceptance criteria:
- Queued drafts sync when connectivity returns
- Failures are surfaced with actionable reason
- Successful drafts become pending-review records server-side

## Phase 7 — Desktop integration for pending drafts

Deliverables:
- Desktop map/admin visibility for pending mobile drafts
- Owner review actions (approve/reject)
- Planting phase wizard includes pending/selectable draft areas per business rule
- Status feedback loop to mobile clients

Acceptance criteria:
- Synced draft is visible on desktop without manual refresh hacks
- Approve promotes draft to `bakki_area` and links origin draft
- Reject updates mobile-visible status with reason

## Phase 8 — Reliability, security, and release hardening

Deliverables:
- Conflict/retry policy for sync queue
- Audit events for draft create/sync/review actions
- Performance pass (large geometry/task list behavior)
- Operational diagnostics for mobile bootstrap/sync health
- Internal distribution packaging and rollout checklist

Acceptance criteria:
- Sync queue survives app restarts and intermittent network
- All privileged actions are auditable
- Release checklist passes for iOS and Android internal distribution

## API workplan (target endpoints)

Keep existing endpoints where already suitable; add mobile-focused endpoints for payload efficiency and sync control.

Recommended additions:
- `GET /v1/mobile/bootstrap`
  - returns user profile/permissions, task summary slice, map geometry slice, and sync cursor metadata
- `GET /v1/mobile/tasks`
  - mobile-optimized task payload with pagination/cursor support
- `POST /v1/mobile/area-drafts/sync`
  - batch upsert from queued local drafts; returns per-draft result/status/errors
- `GET /v1/mobile/area-drafts/status`
  - returns current statuses for user-origin drafts

Keep transport/auth:
- session via `x-bakki-session`
- client hint `x-bakki-client: mobile`

## Data model workplan

Add draft entity (server-side) to separate unapproved mobile geometry from approved production area geometry.

Recommended table: `bakki_area_draft`
- identity + zone/user refs
- geometry + raw capture points
- capture method + GPS quality metadata
- sync status + error fields
- review status + reviewer metadata
- promotion link to `bakki_area`

Validation and lifecycle:
- sync validation is strict and explicit
- approved drafts promote into canonical `bakki_area`
- drafts are retained for audit traceability

## Test strategy

Backend:
- unit tests for draft validation and sync state transitions
- integration tests for sync endpoint and promotion/rejection flows
- auth tests for mobile session header path

Mobile:
- unit tests for offline store and sync queue reducers
- integration tests for login/bootstrap/offline startup
- capture-flow tests for boundary and point modes

End-to-end:
- online login then offline operation for multiple days
- offline draft creation then online sync then desktop review
- rejection and resync/error-recovery paths

## Rollout sequence

1. Ship backend draft model + sync endpoints behind feature flag
2. Release internal mobile alpha for owners only
3. Validate sync/geometry/review loop in production-like usage
4. Enable planter read-only access after owner flow stabilizes
5. Remove feature flag when operational metrics are healthy

## Dependencies and critical path

Critical dependency chain:
1. Mobile app foundation
2. Auth/session
3. Offline bootstrap store
4. Owner capture flow
5. Backend draft sync model
6. Desktop review + wizard integration
7. Reliability hardening + release

Key risk areas:
- offline map tile and geometry size/performance on low-connectivity devices
- geometry validity/conflict handling between local drafts and server truth
- session longevity/security tradeoffs for multi-day offline use

## Definition of done

The implementation is done when:
- mobile users can sign in, cache data, and work offline for multiple days
- planters have read-only tasks/map access
- owners can create offline area drafts and sync them
- desktop can review drafts and make them selectable in planting wizard immediately
- all flows are audited, tested, and released through internal distribution
