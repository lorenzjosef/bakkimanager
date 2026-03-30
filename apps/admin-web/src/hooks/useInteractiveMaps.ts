import { useEffect, useRef, useState } from 'react';
import type { BakkiMapGeometryDraft, BakkiMapHandle, BakkiMapSelection } from '@bakki/map';
import type {
  AreaGeometryProperties,
  BakkiViewId,
  GeoJsonFeatureCollection,
  RanchGeometryProperties,
  ZoneGeometryProperties,
} from '@bakki/domain';
import ranchKml from '@/prototype/ranch-coordinates.kml?raw';
import zonesKml from '@/prototype/zones.kml?raw';
import { useUIStore } from '@/store/ui';

type MapGeometryState = {
  areasGeoJson?: GeoJsonFeatureCollection<AreaGeometryProperties> | null;
  ranchGeoJson?: GeoJsonFeatureCollection<RanchGeometryProperties> | null;
  zonesGeoJson?: GeoJsonFeatureCollection<ZoneGeometryProperties> | null;
};

type RuntimeLayerVisibility = {
  areas: boolean;
  ranch: boolean;
  zones: boolean;
};

type DeferredMapRuntimeState = {
  layerVisibility: RuntimeLayerVisibility;
  selectionMode: 'area' | 'zone';
};

let mapModulePromise: Promise<typeof import('@bakki/map')> | null = null;
let olCssLoaded = false;

function loadMapModule() {
  if (!mapModulePromise) {
    // Lazy load OpenLayers CSS only when map is actually used
    if (!olCssLoaded) {
      import('ol/ol.css');
      olCssLoaded = true;
    }
    mapModulePromise = import('@bakki/map');
  }

  return mapModulePromise;
}

function createDeferredMapRuntimeState(
  selectionMode: 'area' | 'zone' = 'area',
): DeferredMapRuntimeState {
  return {
    layerVisibility: {
      areas: true,
      ranch: true,
      zones: true,
    },
    selectionMode,
  };
}

function buildMapInput(geometry: MapGeometryState | undefined) {
  return {
    areasGeoJson: geometry?.areasGeoJson,
    ranchGeoJson: geometry?.ranchGeoJson,
    ranchKml,
    zonesGeoJson: geometry?.zonesGeoJson,
    zonesKml,
  };
}

function applyDeferredRuntimeState(
  handle: BakkiMapHandle,
  runtimeState: DeferredMapRuntimeState,
  selection: BakkiMapSelection | null,
) {
  handle.setSelectionMode(runtimeState.selectionMode);
  handle.setLayerVisibility('ranch', runtimeState.layerVisibility.ranch);
  handle.setLayerVisibility('zones', runtimeState.layerVisibility.zones);
  handle.setLayerVisibility('areas', runtimeState.layerVisibility.areas);
  handle.setSelectedSelection(selection);
}

function formatHemisphere(value: number, positive: string, negative: string) {
  return `${Math.abs(value).toFixed(4)}° ${value >= 0 ? positive : negative}`;
}

function formatLatLng(lat: number, lng: number) {
  return `${formatHemisphere(lat, 'N', 'S')}, ${formatHemisphere(lng, 'E', 'W')}`;
}

function buildViewerHint(selection: BakkiMapSelection | null) {
  if (!selection) {
    return 'Showing ranch, zone, and available area geometry. Select any zone to open its details.';
  }

  if (selection.kind === 'area') {
    return `Focused on ${selection.areaName ?? selection.zoneName}. The details card now reflects the selected area.`;
  }

  return `Focused on ${selection.zoneName}. The details card now reflects the zone overview and linked area.`;
}

export function useInteractiveMaps(
  viewId: BakkiViewId,
  ref: React.RefObject<HTMLElement | null>,
  geometry?: MapGeometryState,
  enabled = true,
) {
  const [isViewerRuntimeReady, setIsViewerRuntimeReady] = useState(false);
  const [isManagementRuntimeReady, setIsManagementRuntimeReady] = useState(false);
  const [isManagementGeometryDrawing, setIsManagementGeometryDrawing] = useState(false);
  const [isManagementGeometryInteractionActive, setIsManagementGeometryInteractionActive] = useState(false);
  const [managementGeometryDraft, setManagementGeometryDraft] = useState<BakkiMapGeometryDraft | null>(null);
  const viewerHandleRef = useRef<BakkiMapHandle | null>(null);
  const managementHandleRef = useRef<BakkiMapHandle | null>(null);
  const geometryRef = useRef<MapGeometryState | undefined>(geometry);
  const viewerSelectionRef = useRef<BakkiMapSelection | null>(null);
  const managementSelectionRef = useRef<BakkiMapSelection | null>(null);
  const viewerRuntimeStateRef = useRef<DeferredMapRuntimeState>(createDeferredMapRuntimeState());
  const managementRuntimeStateRef = useRef<DeferredMapRuntimeState>(createDeferredMapRuntimeState('zone'));
  const selectedViewerMapSelection = useUIStore((state) => state.selectedViewerMapSelection);
  const selectedManagementMapSelection = useUIStore((state) => state.selectedManagementMapSelection);
  const openMapAreaOverlay = useUIStore((state) => state.openMapAreaOverlay);
  const closeMapAreaOverlay = useUIStore((state) => state.closeMapAreaOverlay);
  const openManagementOverlay = useUIStore((state) => state.openManagementOverlay);
  const closeManagementOverlay = useUIStore((state) => state.closeManagementOverlay);
  const setSelectedViewerMapSelection = useUIStore((state) => state.setSelectedViewerMapSelection);
  const setSelectedManagementMapSelection = useUIStore((state) => state.setSelectedManagementMapSelection);
  const lastViewerHintRef = useRef<string | null>(null);

  useEffect(() => {
    geometryRef.current = geometry;
  }, [geometry?.areasGeoJson, geometry?.ranchGeoJson, geometry?.zonesGeoJson]);

  useEffect(() => {
    const root = ref.current;
    if (!enabled || !root || viewId !== 'map-viewer') {
      return;
    }

    const target = root.querySelector<HTMLElement>('#map-viewer-live-map');
    if (!target || viewerHandleRef.current) {
      return;
    }

    const coordinateEl = root.querySelector<HTMLElement>('#map-viewer-coordinates');
    const hintEl = root.querySelector<HTMLElement>('#map-focus-hint');
    let cancelled = false;
    setIsViewerRuntimeReady(false);

    void loadMapModule().then(({ createBakkiMap }) => {
      if (cancelled || viewerHandleRef.current) {
        return;
      }

      const handle = createBakkiMap({
        target,
        ...buildMapInput(geometryRef.current),
        mode: 'viewer',
        onPointerCoordinate(lat, lng) {
          if (coordinateEl) {
            coordinateEl.textContent = formatLatLng(lat, lng);
          }
        },
        onSelectionChange(selection) {
          if (!selection) {
            closeMapAreaOverlay();
            setSelectedViewerMapSelection(null);
            if (hintEl) {
              const nextHint = buildViewerHint(null);
              hintEl.textContent = nextHint;
              lastViewerHintRef.current = nextHint;
            }
            return;
          }

          setSelectedViewerMapSelection(selection);
          if (hintEl) {
            const nextHint = buildViewerHint(selection);
            if (lastViewerHintRef.current !== nextHint) {
              hintEl.textContent = nextHint;
              lastViewerHintRef.current = nextHint;
            }
          }

          openMapAreaOverlay(selection);
        },
      });

      viewerHandleRef.current = handle;
      applyDeferredRuntimeState(handle, viewerRuntimeStateRef.current, viewerSelectionRef.current);
      setIsViewerRuntimeReady(true);
    });

    return () => {
      cancelled = true;
      viewerHandleRef.current?.destroy();
      viewerHandleRef.current = null;
      setIsViewerRuntimeReady(false);
    };
  }, [closeMapAreaOverlay, enabled, openMapAreaOverlay, ref, setSelectedViewerMapSelection, viewId]);

  useEffect(() => {
    if (viewId !== 'map-viewer') {
      return;
    }

    viewerHandleRef.current?.setData(buildMapInput(geometry));
  }, [geometry?.areasGeoJson, geometry?.ranchGeoJson, geometry?.zonesGeoJson, viewId]);

  useEffect(() => {
    const root = ref.current;
    if (!enabled || !root || viewId !== 'map-management') {
      return;
    }

    const target = root.querySelector<HTMLElement>('#map-management-live-map');
    if (!target || managementHandleRef.current) {
      return;
    }

    const latEl = root.querySelector<HTMLElement>('#map-management-lat');
    const lngEl = root.querySelector<HTMLElement>('#map-management-lng');
    let cancelled = false;
    setIsManagementRuntimeReady(false);

    void loadMapModule().then(({ createBakkiMap }) => {
      if (cancelled || managementHandleRef.current) {
        return;
      }

      const handle = createBakkiMap({
        target,
        ...buildMapInput(geometryRef.current),
        mode: 'management',
        onGeometryDraftChange(draft) {
          setManagementGeometryDraft(draft);
        },
        onGeometryDrawingChange(isDrawing) {
          setIsManagementGeometryDrawing(isDrawing);
        },
        onGeometryInteractionChange(isActive) {
          setIsManagementGeometryInteractionActive(isActive);
          if (!isActive) {
            setIsManagementGeometryDrawing(false);
          }
        },
        onPointerCoordinate(lat, lng) {
          if (latEl) {
            latEl.textContent = formatHemisphere(lat, 'N', 'S');
          }
          if (lngEl) {
            lngEl.textContent = formatHemisphere(lng, 'E', 'W');
          }
        },
        onSelectionChange(selection) {
          if (!selection) {
            closeManagementOverlay();
            setSelectedManagementMapSelection(null);
            return;
          }

          setSelectedManagementMapSelection(selection);
          openManagementOverlay(selection);
        },
      });

      managementHandleRef.current = handle;
      applyDeferredRuntimeState(handle, managementRuntimeStateRef.current, managementSelectionRef.current);
      setIsManagementRuntimeReady(true);
    });

    return () => {
      cancelled = true;
      managementHandleRef.current?.destroy();
      managementHandleRef.current = null;
      setManagementGeometryDraft(null);
      setIsManagementGeometryDrawing(false);
      setIsManagementGeometryInteractionActive(false);
      setIsManagementRuntimeReady(false);
    };
  }, [closeManagementOverlay, enabled, openManagementOverlay, ref, setSelectedManagementMapSelection, viewId]);

  useEffect(() => {
    if (viewId !== 'map-management') {
      return;
    }

    managementHandleRef.current?.setData(buildMapInput(geometry));
  }, [geometry?.areasGeoJson, geometry?.ranchGeoJson, geometry?.zonesGeoJson, viewId]);

  useEffect(() => {
    viewerSelectionRef.current = selectedViewerMapSelection;
    viewerHandleRef.current?.setSelectedSelection(selectedViewerMapSelection);
  }, [selectedViewerMapSelection]);

  useEffect(() => {
    managementSelectionRef.current = selectedManagementMapSelection;
    managementHandleRef.current?.setSelectedSelection(selectedManagementMapSelection);
  }, [selectedManagementMapSelection]);

  return {
    geometryDraft: managementGeometryDraft,
    isGeometryDrawing: isManagementGeometryDrawing,
    isGeometryInteractionActive: isManagementGeometryInteractionActive,
    isRuntimeReady: viewId === 'map-viewer' ? isViewerRuntimeReady : isManagementRuntimeReady,
    beginAreaGeometryEdit(areaId: string) {
      return managementHandleRef.current?.beginAreaGeometryEdit(areaId) ?? false;
    },
    beginAreaGeometryCreate(zoneId: string, zoneName?: string | null) {
      return managementHandleRef.current?.beginAreaCreation(zoneId, zoneName) ?? false;
    },
    beginZoneGeometryEdit(zoneId: string) {
      return managementHandleRef.current?.beginZoneGeometryEdit(zoneId) ?? false;
    },
    finishGeometryDraw() {
      return managementHandleRef.current?.finishGeometryDraw() ?? false;
    },
    cancelGeometryEdit() {
      managementHandleRef.current?.cancelGeometryEdit();
      setManagementGeometryDraft(null);
      setIsManagementGeometryDrawing(false);
      setIsManagementGeometryInteractionActive(false);
    },
    handleMapControl(target: 'viewer' | 'management', action: 'zoom-in' | 'zoom-out' | 'reset') {
      const handle = target === 'viewer' ? viewerHandleRef.current : managementHandleRef.current;
      if (!handle) {
        return;
      }

      if (action === 'zoom-in') {
        handle.zoomIn();
      }

      if (action === 'zoom-out') {
        handle.zoomOut();
      }

      if (action === 'reset') {
        handle.reset();
      }
    },
    setMapLayerVisibility(
      target: 'viewer' | 'management',
      layer: 'areas' | 'ranch' | 'zones',
      visible: boolean,
    ) {
      const runtimeState = target === 'viewer' ? viewerRuntimeStateRef.current : managementRuntimeStateRef.current;
      runtimeState.layerVisibility[layer] = visible;

      const handle = target === 'viewer' ? viewerHandleRef.current : managementHandleRef.current;
      handle?.setLayerVisibility(layer, visible);
    },
    setMapSelectionMode(target: 'viewer' | 'management', mode: 'area' | 'zone') {
      const runtimeState = target === 'viewer' ? viewerRuntimeStateRef.current : managementRuntimeStateRef.current;
      runtimeState.selectionMode = mode;

      const handle = target === 'viewer' ? viewerHandleRef.current : managementHandleRef.current;
      handle?.setSelectionMode(mode);
    },
    setManagementHoveredSelection(selection: BakkiMapSelection | null) {
      managementHandleRef.current?.setHoveredSelection(selection);
    },
    resetGeometryEdit() {
      managementHandleRef.current?.resetGeometryEdit();
    },
  };
}
