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
- `packages/domain` — 100% reusable (1,764 lines of framework-agnostic types)
- shared API DTOs and validation
- shared auth and permission rules
- shared design tokens

Add mobile-specific packages:
- `packages/mobile-offline` — offline storage, sync queue, conflict resolution

### Mobile map approach

The current `@bakki/map` uses OpenLayers (web-only). For mobile:
- Use **react-native-maps** (wraps native iOS/Android map SDKs)
- Reuse GeoJSON types and geometry logic from `@bakki/domain`
- Keep map handle interface patterns but implement natively

### Why this is the right approach

The backend already supports mobile-friendly patterns:
- Session token header transport (`x-bakki-session`) for non-cookie auth
- `mobileAccessEnabled` flag on user records
- Offline-first mirror database (BakkiCore) with sync tracking
- GeoJSON-based geometry API already in place

The current `@bakki/domain` package contains all needed types:
- `BakkiSessionUser`, `BakkiUserRole` (owner/planter)
- `GeoJsonGeometry`, `GeoJsonFeature`, `GeoJsonFeatureCollection`
- Task and area types with workflow states
- All types are serializable and framework-agnostic

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

Add a dedicated concept for mobile-captured areas:

### New table: `bakki_area_draft`

```sql
CREATE TABLE bakki_area_draft (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES bakki_zone(id),
  created_by_user_id INTEGER NOT NULL REFERENCES bakki_user(id),
  name TEXT NOT NULL,
  geometry GEOMETRY(Polygon, 4326) NOT NULL,
  hectare_total NUMERIC(10,4),
  capture_method TEXT NOT NULL CHECK (capture_method IN ('boundary_walk', 'point_by_point')),
  raw_capture_points JSONB, -- preserved for desktop review
  device_info JSONB, -- mobile device metadata
  gps_accuracy_meters NUMERIC(6,2),
  sync_status TEXT NOT NULL DEFAULT 'local' CHECK (sync_status IN ('local', 'queued', 'synced', 'failed', 'rejected')),
  sync_error TEXT,
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected')),
  reviewed_by_user_id INTEGER REFERENCES bakki_user(id),
  reviewed_at TIMESTAMPTZ,
  promoted_area_id UUID REFERENCES bakki_area(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Sync conflict resolution

When a draft syncs:
1. Server validates geometry (within zone, no overlap with existing areas)
2. If valid: `sync_status = 'synced'`, `review_status = 'pending'`
3. If invalid: `sync_status = 'failed'`, `sync_error` describes the issue
4. Desktop owner reviews and either approves (promotes to `bakki_area`) or rejects

### Mobile-to-desktop visibility

Pending drafts are immediately visible in:
- Desktop map overlays (with draft styling)
- Planting phase wizard area selector (as selectable pending areas)

When a draft is approved:
- A real `bakki_area` row is created
- `promoted_area_id` links the draft to the new area
- Draft is archived, not deleted
