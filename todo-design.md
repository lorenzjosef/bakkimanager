# Bakki Design Todo

## 1. Source Of Truth

- [x] Treat `prototype/` as the visual source of truth
- [ ] Use Figma only when the prototype is missing a required state or asset
- [x] Freeze palette, typography, spacing, radius, and shadow rules in `design.md`
- [ ] Record any intentional visual deviations in `design.md`

## 2. App Shell

- [x] Implement the approved sidebar structure
- [x] Implement the approved top bar
- [x] Implement brand block, nav list, action block, support/settings links, and owner footer card
- [ ] Verify shell parity against the prototype and tighten remaining drift:
  - sidebar brand icon rendering
  - owner footer/icon spacing
  - shared button and tool icon scale

## 3. Shared Components

### Already extracted

- [x] Buttons: first shared primitive pass
- [x] Cards: first shared primitive pass
- [x] Tables: first shared primitive pass
- [x] Forms: first shared primitive pass
- [x] Split-detail layout: first shared primitive pass

### Still to extract or standardize

- [x] Status chips and state badges
- [x] Wizard shell pieces
- [x] Map overlay containers
- [x] Density summary cards and contract-fulfillment emphasis blocks
- [x] Explicit loading, empty, and error state shells

## 4. Module Surfaces

- [x] Dashboard implemented natively
- [x] Map Viewer implemented natively
- [x] Map Management implemented natively
- [x] System Settings implemented natively
- [x] Support implemented natively
- [x] User Management implemented natively
- [x] Species Management implemented natively
- [x] Species Management stock-adjustment modal added in the native page family
- [x] Species Management create-species modal added in the native page family
- [x] Species detail flyout restored as a prototype-style overlay
- [x] Planting Phases implemented natively
- [x] Task Management implemented natively
- [x] Task-management map surface restored
- [x] Live-empty task and phase pages now avoid showing fake seeded history when the configured backend returns no records
- [ ] Verify visual parity of each module against the prototype
- [ ] Tighten cross-page consistency where spacing, density, or emphasis still drift
- [x] Replace the dedicated runtime fallback path on `Species Management`; the page now reads only from live species payloads and honest unavailable states
- [ ] Restore the missing prototype-parity module surfaces:
  - planting-phase historic detail card/view

## 5. Map UI

- [x] Build native map pages around the approved visual language
- [x] Promote density and contract fulfillment to the primary overlay metrics
- [x] Add manual density-edit controls to the map-management popup without changing the page family
- [ ] Verify zone styling against the prototype
- [ ] Verify selected-zone, selected-area, and hover states against the prototype
- [ ] Finalize map loading, empty, and error states in the same design language
- [x] Match the prototype right-overlay geometry:
  - top-right docking
  - close button parity
  - internal scrolling when content exceeds viewport
- [x] Make the map-management legend/layer toggle behave like a real control surface instead of static chrome
- [ ] Final visual audit of map card spacing, typography, and card height against the prototype
- [x] Reduce the perceived first-paint delay on `Map Viewer` and `Map Management`
- [x] Make the dashboard map cards paint a fallback preview silhouette when live geometry is unavailable
- [x] Split map detail presentation cleanly into:
  - zone card
  - area card
- [x] Add a real selected-area boundary edit/save loop to `Map Management`
- [x] Start restoring the intended `Map Management` control split:
  - legend rows own ranch/zone/area visibility
  - tool stack owns boundary edit entry, draft reset, and edit exit
- [x] Add a real selected-zone boundary edit/save loop to `Map Management` and remove the old auto-start area edit behavior so the tool stack truly owns edit entry
- [x] Restore live hover feedback for zone and area geometry so the interactive map no longer feels static before selection
- [x] Restore the prototype-style management summary block for zone selection with live density and fulfillment values
- [x] Tighten the idle area card workflow so it returns directly to zone summary and keeps the tool stack as the sole boundary-edit entry point
- [x] Make the `Map Viewer` area-detail footer open `Map Management` with the same area selection instead of leaving `Edit Area Geometry` as dead chrome
- [x] Make the `Map Viewer` top pills and legend reflect real read-only layer visibility and live focus state while keeping the prototype surface shape
- [ ] Finish the remaining editable map-management tool workflow beyond the current selected area/zone boundary editors

## 6. Dashboard And Phase-Specific Copy Hierarchy

- [x] Replace the generic home task list with a program-of-the-day surface
- [x] Replace planting-goal emphasis on the homepage with contract-fulfillment emphasis
- [ ] Verify the new density-first copy hierarchy still matches the approved visual family
- [x] Restore richer dashboard hero forest/map surfaces so they no longer read as blank placeholders

## 7. Visual QA

- [ ] Compare screenshots against the prototype after each major dynamic-data step
- [ ] Adjust typography sizes and spacing before changing structure
- [ ] Avoid introducing generic component-library styling
- [ ] Verify the new settings and support pages against the fallback-derived prototype states
