# Bakki Mobile Field App Plan

## Goal

Design a **Bakki mobile field app** that complements the existing desktop app by giving users mobile access to the field-critical workflows: personal task visibility, offline ranch map access, and owner-only offline area capture. It should stay visually aligned with the existing Bakki product and reuse the current TypeScript/React stack where that keeps complexity low.

## Confirmed decisions

- Same role model as desktop, but mobile only includes **field-critical workflows**
- Platforms: **iPhone + Android**
- Distribution: **internal only**
- Users can stay signed in and usable **offline for multiple days**
- Tasks on mobile are **read-only**
- Planters are **strictly read-only**
- No evidence capture in v1
- Planting phase creation is **desktop-only permanently**
- Offline map includes the **full ranch map**, **cached base map**, and **all relevant areas**
- Offline data is **automatically cached after login**
- Owners can create areas **offline**
- Area capture supports:
  - walking a boundary live
  - adding individual GPS points
- Area shape/size is **calculated automatically**
- Owner can **name** the area in the app
- Synced mobile-created areas become **pending/draft**
- Pending areas must still appear and be **selectable immediately** in the desktop planting phase wizard
- Recommended product option: **Option 2 — balanced field app**

## Recommended product direction

I recommend a **React Native mobile app inside the existing monorepo**.

Use the current repo as the source for:
- shared domain types
- API contracts
- auth rules
- business rules
- design tokens and visual language

Do **not** try to reuse the current web UI layer or the current web map rendering directly. Your repo already shows a web/Electron structure with shared TypeScript packages and a strict design spec, so the right reuse boundary is **logic and contracts**, not **rendering**.

## Suggested technical shape

### App structure

Add a new app:
- `apps/mobile`

Keep sharing from the monorepo:
- `packages/domain`
- shared API DTOs / validation
- shared auth and permission rules
- shared design tokens

Add mobile-specific packages if helpful:
- `packages/mobile-ui`
- `packages/mobile-map`
- `packages/mobile-offline`

### Why this is the right approach

The product is already centered around:
- React/Vite for admin web
- Electron for desktop
- shared TypeScript packages like `@bakki/domain`, `@bakki/ui`, and `@bakki/map`
- a strict design spec in `design.md`

That makes a shared TypeScript/mobile approach a good fit, but the current `@bakki/map` is web-oriented, so mobile should have its own map renderer while keeping shared geometry/domain logic.

## v1 scope

### For all mobile users

- sign in
- stay signed in offline for multiple days
- automatic local caching after login
- see personal task list
- sort/filter by due date and priority
- open task details
- open map
- view full ranch map offline
- view assigned and relevant areas
- see area details relevant to work context
- clearly see offline / stale-data state

### For planters

- read-only access only
- no task updates
- no task completion actions
- no notes/photos/GPS submissions

### For owners

Everything planters get, plus:
- create a new area offline
- choose between:
  - live GPS boundary walk
  - point-by-point capture
- automatic geometry/area calculation
- name the area
- save locally offline
- sync later when online
- synced record lands as **pending**
- desktop can review later
- pending area is already visible/selectable in the desktop planting wizard

## Recommended mobile information architecture

I would keep it simple:

### Main tabs

- **Tasks**
- **Map**
- **Areas** (owner-enhanced view)
- **Profile / Sync**

### Key screens

- Login
- Offline-ready home / landing
- My Tasks
- Task Detail
- Ranch Map
- Area Detail
- Create Area (owner only)
- Capture Boundary
- Add GPS Points
- Review Draft Area
- Sync Status / Offline Status

## UX approach

The design should feel like **Bakki on mobile**, not a generic mobile admin app.

Use the desktop product as the visual source for:
- colors
- typography roles
- card language
- shadows
- map overlays
- chip/status styling
- action hierarchy

But do **not** force the desktop sidebar shell onto mobile. On phone, adapt the same design language into:
- top header
- compact cards
- floating map overlays
- bottom tab navigation
- mobile-first spacing and gesture-safe controls

## Offline model

### What gets cached automatically

After login, cache:
- current user profile + permissions
- personal task data
- task metadata needed for filters
- full ranch map base data
- relevant area geometry and area metadata
- pending local owner-created areas

### Offline behavior

Users can:
- browse cached tasks
- browse cached map
- inspect cached area details
- create area drafts offline if they are owners

Users cannot:
- edit tasks
- change assignments
- create planting phases
- sync area drafts until connection returns

### Sync behavior

Only owner-created area drafts need outbound sync in v1.

Suggested states:
- Local Draft
- Queued for Sync
- Synced as Pending Review
- Sync Failed
- Rejected
- Approved

## Area capture workflow

### Method 1: live boundary walk

- owner starts capture
- app records GPS track points
- app shows live line/polygon preview
- owner stops capture
- app smooths/validates enough for draft use
- app calculates area automatically
- owner enters area name
- app saves as offline draft

### Method 2: point-by-point capture

- owner drops individual GPS points
- app connects them automatically into a polygon
- app calculates area automatically
- owner can remove last point / reset
- owner enters area name
- app saves as offline draft

### Recommended rules

- minimum point count before save
- warn on obviously invalid/self-crossing shapes
- show GPS confidence/status while capturing
- allow owner to discard before save
- keep raw captured points for desktop review if needed

## Desktop integration needed

Even though the mobile app is the new surface, the desktop/backend will need support for it.

### Backend/API additions

You’ll likely need:
- mobile auth/session support
- mobile bootstrap endpoint for offline preload
- task list endpoint tuned for current user
- map preload endpoint for ranch + areas
- create mobile area draft endpoint
- sync endpoint for pending area drafts
- draft/pending area status endpoint

### Desktop behavior additions

Desktop should support:
- review of pending mobile-created areas
- visibility of pending areas in map/admin views
- inclusion of pending areas in the planting phase wizard
- status updates back to mobile-created records

## Data model additions

I’d add a dedicated concept for mobile-captured areas rather than mixing them immediately with fully approved areas.

Suggested entity:
- `PendingAreaDraft`

Suggested fields:
- id
- createdByUserId
- createdAt
- source = mobile
- captureMethod = live_boundary | point_capture
- name
- geometry
- calculatedArea
- gpsPointSet / raw track
- syncStatus
- reviewStatus
- reviewNotes
- linkedApprovedAreaId nullable

That keeps approval logic clean and traceable.

## Biggest risks

### 1. Offline map complexity

This is the biggest technical risk. Keep v1 map behavior focused on:
- reliable viewing
- reliable caching
- simple layer model

### 2. GPS quality

Poor signal can produce bad shapes. You’ll need:
- validation
- minimum quality thresholds
- clear user feedback during capture

### 3. Pending-area lifecycle

If pending areas are selectable in the desktop phase wizard before review, the approval/rejection lifecycle needs clear business rules so later cleanup does not break planning.

### 4. Over-reusing web code

Reuse shared domain and contracts, but avoid forcing web UI or OpenLayers abstractions into mobile.

## Delivery plan

### Phase 1 — foundation

- add mobile app to monorepo
- auth
- role handling
- local persistence
- offline session strategy
- shared design tokens for mobile

### Phase 2 — read-only field workflows

- task list
- task detail
- full offline ranch map
- area detail overlays
- automatic caching after login

### Phase 3 — owner capture workflow

- live boundary capture
- point-by-point capture
- automatic area calculation
- naming + local drafts
- sync queue + retry states

### Phase 4 — desktop/backend integration

- pending area ingestion
- review flow
- planting wizard visibility/selectability
- error handling and state reconciliation

### Phase 5 — hardening

- ranch offline testing
- GPS accuracy testing
- conflict/error testing
- battery/performance tuning
- internal rollout

## Acceptance criteria for v1

The first release is successful if:
- a user can sign in and continue using the app offline for multiple days
- a planter can open their tasks and map with no connection
- the ranch map and areas are available offline automatically after login
- an owner can create and save a new area offline
- the app calculates the area automatically
- the owner can name the area
- the draft syncs later when online
- the synced area appears as pending on desktop
- the pending area is visible/selectable in the desktop planting phase wizard
- the mobile UI clearly feels like the same Bakki product family

## Final recommendation

Build **Option 2** as a **React Native monorepo app** that shares **domain logic and contracts** with the current Bakki codebase, while keeping **mobile UI, offline storage, and map rendering** mobile-specific.

That is the best balance of:
- scope control
- internal release speed
- offline reliability
- design consistency
- and long-term maintainability
