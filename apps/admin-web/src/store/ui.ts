import type { BakkiMapSelection } from '@bakki/map';
import { create } from 'zustand';
import { isSameMapSelection } from '@/lib/map-selection';

interface UIState {
  mapTaskModalOpen: boolean;
  mapTaskAreaId: string | null;
  mapTaskAreaLabel: string | null;
  mapAreaOverlayOpen: boolean;
  mapManagementOverlayOpen: boolean;
  draftReviewModalOpen: boolean;
  speciesDetailOpen: boolean;
  selectedSpeciesId: string | null;
  selectedViewerMapSelection: BakkiMapSelection | null;
  selectedManagementMapSelection: BakkiMapSelection | null;
  openMapTaskModal: (areaLabel?: string | null, areaId?: string | null) => void;
  closeMapTaskModal: () => void;
  openMapAreaOverlay: (selection: BakkiMapSelection) => void;
  closeMapAreaOverlay: () => void;
  openManagementOverlay: (selection: BakkiMapSelection) => void;
  closeManagementOverlay: () => void;
  openDraftReviewModal: () => void;
  closeDraftReviewModal: () => void;
  openSpeciesDetail: (speciesId: string) => void;
  closeSpeciesDetail: () => void;
  resetRouteScopedUI: () => void;
  setSelectedSpeciesId: (speciesId: string | null) => void;
  setSelectedViewerMapSelection: (selection: BakkiMapSelection | null) => void;
  setSelectedManagementMapSelection: (selection: BakkiMapSelection | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  mapTaskModalOpen: false,
  mapTaskAreaId: null,
  mapTaskAreaLabel: null,
  mapAreaOverlayOpen: false,
  mapManagementOverlayOpen: false,
  draftReviewModalOpen: false,
  speciesDetailOpen: false,
  selectedSpeciesId: null,
  selectedViewerMapSelection: null,
  selectedManagementMapSelection: null,
  openMapTaskModal: (areaLabel, areaId) =>
    set((state) =>
      state.mapTaskModalOpen
      && state.mapTaskAreaLabel === (areaLabel ?? null)
      && state.mapTaskAreaId === (areaId ?? null)
        ? state
        : {
            mapTaskModalOpen: true,
            mapTaskAreaId: areaId ?? null,
            mapTaskAreaLabel: areaLabel ?? null,
          },
    ),
  closeMapTaskModal: () =>
    set((state) =>
      state.mapTaskModalOpen || state.mapTaskAreaLabel || state.mapTaskAreaId
        ? { mapTaskModalOpen: false, mapTaskAreaId: null, mapTaskAreaLabel: null }
        : state,
    ),
  openMapAreaOverlay: (selection) =>
    set((state) =>
      state.mapAreaOverlayOpen && isSameMapSelection(state.selectedViewerMapSelection, selection)
        ? state
        : { mapAreaOverlayOpen: true, selectedViewerMapSelection: selection },
    ),
  closeMapAreaOverlay: () => set((state) => (state.mapAreaOverlayOpen ? { mapAreaOverlayOpen: false } : state)),
  openManagementOverlay: (selection) =>
    set((state) =>
      state.mapManagementOverlayOpen && isSameMapSelection(state.selectedManagementMapSelection, selection)
        ? state
        : { mapManagementOverlayOpen: true, selectedManagementMapSelection: selection },
    ),
  closeManagementOverlay: () =>
    set((state) => (state.mapManagementOverlayOpen ? { mapManagementOverlayOpen: false } : state)),
  openDraftReviewModal: () =>
    set((state) => (state.draftReviewModalOpen ? state : { draftReviewModalOpen: true })),
  closeDraftReviewModal: () =>
    set((state) => (state.draftReviewModalOpen ? { draftReviewModalOpen: false } : state)),
  openSpeciesDetail: (speciesId) =>
    set((state) =>
      state.speciesDetailOpen && state.selectedSpeciesId === speciesId
        ? state
        : { speciesDetailOpen: true, selectedSpeciesId: speciesId },
    ),
  closeSpeciesDetail: () => set((state) => (state.speciesDetailOpen ? { speciesDetailOpen: false } : state)),
  resetRouteScopedUI: () =>
    set((state) =>
      state.mapAreaOverlayOpen
      || state.mapManagementOverlayOpen
      || state.draftReviewModalOpen
      || state.speciesDetailOpen
      || state.selectedSpeciesId
      || state.selectedViewerMapSelection
      || state.selectedManagementMapSelection
        ? {
            mapAreaOverlayOpen: false,
            mapManagementOverlayOpen: false,
            draftReviewModalOpen: false,
            speciesDetailOpen: false,
            selectedSpeciesId: null,
            selectedViewerMapSelection: null,
            selectedManagementMapSelection: null,
          }
        : state,
    ),
  setSelectedSpeciesId: (speciesId) =>
    set((state) => (state.selectedSpeciesId === speciesId ? state : { selectedSpeciesId: speciesId })),
  setSelectedViewerMapSelection: (selection) =>
    set((state) => (
      isSameMapSelection(state.selectedViewerMapSelection, selection)
        ? state
        : { selectedViewerMapSelection: selection }
    )),
  setSelectedManagementMapSelection: (selection) =>
    set((state) => (
      isSameMapSelection(state.selectedManagementMapSelection, selection)
        ? state
        : { selectedManagementMapSelection: selection }
    )),
}));
