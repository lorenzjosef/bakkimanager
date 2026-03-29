# Bakki Design Specification

This document is the binding design reference for the real Bakki product.

The final product must look like the approved prototype, not merely be inspired by it. The prototype defines the approved page compositions, component patterns, visual tone, and interaction placements. The production app may replace static data and static scripting, but it must preserve the approved visual result.

## 1. Source Of Truth

Priority order for design decisions:

1. `prototype/` is the final visual source of truth for all approved pages
2. Figma is fallback reference only for pages, states, or assets missing from the prototype
3. `design.md` is the implementation translation of those approved visuals

If there is any conflict between earlier planning language, Figma, and the approved prototype, the prototype wins.

## 2. Core Design Rule

The production app must preserve the approved prototype in these dimensions:

- same page structure
- same shell layout
- same card ordering
- same overlay positions
- same primary action hierarchy
- same typography roles
- same color palette
- same spacing rhythm
- same border radius language
- same shadow treatment

Production changes are allowed only in these dimensions:

- static data becomes dynamic data
- static images may become managed assets while keeping the same visual intent
- static DOM scripting becomes React state and typed data flows
- loading, empty, and error states may be added if they preserve the normal layout structure

## 3. Visual System

### 3.1 Color Tokens

Use these tokens as the default product palette because they are already present in the prototype:

- background: `#F8F9FA`
- sidebar background: `#F5F5F4`
- main surface: `#FFFFFF`
- soft surface: `#E7E8E9`
- muted surface: `#EDEEEF`
- primary green: `#154212`
- deep green: `#064E3B`
- soft green accent: `#BCF0AE`
- primary text: `#191C1D`
- secondary text: `#42493E`
- muted text: `#78716C`
- standard divider: `rgba(194, 201, 187, 0.2)`

Allowed accent colors already used by the prototype:

- muted slate blue cards and chips
- pale blue utility fills
- pale neutral gray chips
- controlled warning red for alerts only

Do not introduce new dominant brand colors.

### 3.2 Typography

The prototype uses three font families. Keep the same hierarchy in production.

- `Inter`: default body font, form labels, table content, utility copy, small metadata
- `Manrope`: page titles, section titles, card headlines, high-emphasis labels, map labels, major CTA text
- `Epilogue`: limited accent usage only where the prototype already uses it for strong button or preview emphasis

Typography rules:

- use `Manrope` for all page-level headings
- use `Inter` for most application text and interactive controls
- do not introduce a fourth font family
- do not replace the type system with generic system fonts

### 3.3 Shape And Shadow Language

The prototype uses a restrained card system. Keep the same shape grammar.

Radii:

- small: `8px`
- medium: `12px`
- large: `16px`
- extra large: `24px`
- pill controls: fully rounded only where the prototype already uses pills or chips

Shadows:

- soft shadow for standard cards and panels
- deeper card shadow for feature surfaces and overlays
- green shadow only on primary green CTAs

Do not introduce heavy glassmorphism, harsh borders, or flat no-shadow replacements.

## 4. Shell And Layout Rules

### 4.1 Global Shell

The approved application shell is the contemporary sidebar shell visible in the prototype.

Shell requirements:

- fixed left sidebar
- sidebar width: `256px`
- top app bar in the main shell on standard pages
- large desktop-first page surfaces
- content aligned inside generous padded containers

Sidebar requirements:

- brand block at top with `Bakki Manager`
- green `Create Task` CTA under brand
- navigation stack below
- settings and support links at the bottom
- owner card at footer

Main shell requirements:

- page title in top bar on standard pages
- centered search field
- icon actions and green CTA on the right
- content sits inside a light warm neutral background

### 4.2 Desktop-First Responsiveness

The product is desktop-first.

Responsive rules:

- preserve the desktop composition whenever possible
- collapse multi-column layouts only when width genuinely requires it
- maintain the same shell and visual tone on smaller widths
- never replace the approved design with a generic mobile-stacked admin layout

Use the prototype’s breakpoint intent as the basis for responsive behavior. The stylesheet already contains breakpoint families around wide desktop, laptop, tablet, and narrow content widths. Preserve that behavior rather than inventing a new responsive system.

## 5. Approved Route Inventory

These routes are visually approved because they exist in the prototype:

- `/dashboard`
- `/map-viewer`
- `/map-management`
- `/settings/general`
- `/settings/odoo`
- `/settings/notifications`
- `/settings/map`
- `/support`
- `/planting-phases`
- `/planting-phases/new/info`
- `/planting-phases/new/team`
- `/planting-phases/new/areas`
- `/planting-phases/new/confirm`
- `/users`
- `/species`
- `/task-management`

These routes must preserve their prototype layout exactly.

## 6. Page-Specific Design Rules

### 6.1 Dashboard

The dashboard is the home page and establishes the visual language for the entire app.

Must preserve:

- `Hello, Alain` style hero treatment
- split content rhythm with a strong left-led composition
- active phase feature card
- conditions and biodiversity side cards
- large map preview surface
- program-of-the-day panel
- contemporary sidebar styling

Updated content rules:

- the active phase card must prioritize contract fulfillment over generic planting-goal copy
- density per 100 square meters must be visible on the home screen as a top-tier metric
- the lower activity panel must read as a daily ranch program, not a generic open-tasks list

Do not revert to the earlier dashboard variant.

### 6.2 Map Viewer

The map viewer is a focused map page in the same design family as the dashboard.

Must preserve:

- same contemporary shell and sidebar
- large map focus card
- top map pills and count chips
- floating map controls
- floating legend and coordinates cards
- on-map area details overlay
- create-task modal launched from the map overlay

The map overlay card must appear over the map, not in a detached side panel.

Metric priority rules:

- density per 100 square meters must be visually dominant in the overlay
- contract fulfillment must appear next to density as a primary area-health metric
- supporting metrics such as species, planter, and tree count are secondary to density

### 6.3 Map Management

Map management is a map-first editing workspace.

Must preserve:

- the new Figma-derived management page body already in the prototype
- floating tool groups over the map
- floating layer/status cards
- on-map zone details popup rather than a fixed right rail
- the same visual family as the main map page and dashboard

The map remains the focus. Supporting controls must float over it, not dominate it.

Metric priority rules:

- the selected zone/area popup must surface density prominently at the top
- contract fulfillment, current tree count, and assigned planter should appear before lower-priority metadata
- the map-management popup must expose editable density and tree-count inputs without changing the popup’s overall composition

### 6.4 Planting Phases

There are two visual groups here:

- planting phase overview page
- four-step wizard pages

Must preserve:

- overview page styling from the approved prototype state
- wizard pages as dedicated pages, not a single in-place content swap
- shared wizard shell, shared stepper, shared footer action rhythm
- the current prototype’s unified wizard family across all four steps

Workflow rules:

- the area step is contract-based, not generic goal-based
- each selected area has exactly one assigned planter in the phase
- each selected area requires a contractual tree goal
- target density is editable per selected area and should be shown in the confirm step

### 6.5 System Settings

There are five utility-style pages in the same shell family:

- general settings
- Odoo settings
- notification settings
- map settings
- support

Must preserve:

- the same contemporary shell and utility-footer navigation treatment
- large page-title treatment with dense settings surfaces
- the horizontal settings-tab row across all four settings pages
- high-density administrative cards without turning into generic form-builder layouts

Settings rules:

- the four settings pages must read as one family, with the same tab bar, card proportions, and control hierarchy
- the support page must keep the more editorial hero treatment rather than collapsing into a standard form screen
- map settings must stay visually tied to the map-management visual system
- Odoo settings must preserve the operational/admin tone rather than the softer dashboard treatment

### 6.6 User Management

Must preserve:

- large page heading
- left onboarding card
- right permissions card
- registry section below
- role cards, preview box, and primary CTA placement
- clean dense administrative feel without becoming cramped

The production version must keep the approved button placements, icon treatment, and card proportions.

### 6.6 Species Management

Must preserve:

- large inventory table surface
- detail panel opening on the right when a species is selected
- the approved selected-row treatment
- the prototype’s restrained data density and muted card styling

### 6.7 Task Management

Must preserve:

- the approved summary cards at the top
- distribution card, map card, and log card composition
- right-aligned task actions where shown in the prototype
- clean log-style management layout
- if a monitoring-result modal is exposed from the task log, it must use the same restrained modal language as the rest of the app and must not change the table/card composition underneath

### 6.8 Pages Not Yet In The Prototype

Any page or state that does not currently exist in the prototype must inherit the same design language.

New pages must use:

- the same sidebar shell
- the same top bar pattern unless the page is an approved full-focus wizard variant
- the same token palette
- the same card radii and shadows
- the same typography hierarchy
- the same button treatment
- the same map chrome if a map is involved

New pages must not introduce:

- a second visual theme
- a second navigation shell
- alternate spacing scales
- alternate table styling systems
- alternate form styling systems

## 7. Shared Component Inventory

The production component library should preserve these prototype patterns as reusable components:

- application shell
- sidebar
- top bar
- primary green CTA
- neutral secondary button
- pill chips and status chips
- standard card
- feature card
- table shell
- search/filter input surface
- right-side detail panel
- on-map overlay card
- modal card
- wizard step shell
- map legend card
- map coordinates card
- map floating control group

Component extraction rule:

- do not normalize away real visual differences that are intentional in the prototype
- only merge patterns when the visual difference is not meaningful

## 8. Dynamic Data Rules

The production app must stop using static content, but the layout must remain the same.

Rules for replacing static data:

- static card labels become API-backed text without changing card dimensions
- tables become mapped data rows with the same column layout
- charts or metrics preserve the same visual space and emphasis hierarchy
- images may be dynamic, but image aspect ratios and card framing must remain consistent
- overlays and modals must open in the same place and with the same visual density as the prototype

Required additional states for production:

- loading state
- empty state
- error state

Those states must:

- stay inside the same card or page frame
- not collapse the layout unpredictably
- not introduce a different design system

## 9. Map-Specific Design Rules

The map must feel like part of the product, not a foreign GIS tool.

Map rules:

- the base map sits inside a designed container, not directly on the page background
- map overlays float as cards using the same product shadows and radii
- selected entities use subdued green emphasis, not loud neon highlights
- legends and controls must read as part of the Bakki UI system
- coordinates, status, and layer cards must be light and compact
- editing tools in map management must preserve the approved floating-toolbar model

Read-only and editing modes may differ functionally, but they must remain visually related.

## 10. Asset Rules

The prototype currently references temporary Figma asset URLs.

Production rules:

- localize or manage assets in the real application build
- preserve the same crop, aspect ratio, and tone where those assets are visible in the prototype
- if an asset must change, replace it with one that preserves the same visual role

Do not let asset replacement change the page composition.

## 11. Implementation Rules For Engineers

When rebuilding the prototype into React:

- start from the approved layout structure
- match visuals first, then extract reusable abstractions
- keep route-level screens visually identical before optimizing
- do not “improve” the design during implementation without approval
- treat the prototype as a parity target during QA

The production app should feel like the prototype became live data, not like the prototype was redesigned.

## 12. Acceptance Standard

The design implementation is correct only if:

- a user can compare the real app to the prototype and recognize the same product immediately
- approved pages keep the same layout, hierarchy, and tone
- dynamic data replaces static data without changing the visual contract
- new pages and states feel native to the same design system
