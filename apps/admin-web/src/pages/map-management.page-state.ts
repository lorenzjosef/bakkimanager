import { useEffect, useRef, useState } from 'react';
import type { BakkiMapSelection } from '@bakki/map';
import {
  isSameMapSelection,
  MAP_MANAGEMENT_HANDOFF_STORAGE_KEY,
  parseMapSelection,
} from '@/lib/map-selection';
import { useUIStore } from '@/store/ui';
import { useInteractiveMaps } from '@/hooks/useInteractiveMaps';
import {
  useAreaGeometryData,
  useCreateAreaMutation,
  useDeleteAreaMutation,
  useMapManagementData,
  useRanchGeometryData,
  useUpdateAreaDetailsMutation,
  useUpdateAreaGeometryMutation,
  useUpdateAreaMetricsMutation,
  useUpdateZoneGeometryMutation,
  useZoneGeometryData,
} from '@/queries/map';
import {
  buildZoneSummarySelection,
  createAreaMetricsDraft,
  formatZoneName,
  resolveAreaNameDraft,
  type MapManagementOverlayMode,
  resolveMapManagementRenderState,
  resolveOverlayModeFromSelection,
  resolveZoneAreas,
} from './map-management.utils';
import { buildMapManagementEditorState } from './map-management.page-editor';

function buildSelectionKey(selection: BakkiMapSelection | null) {
  if (!selection) {
    return null;
  }

  return `${selection.kind}:${selection.zoneId}:${selection.areaId ?? ''}`;
}

export function useMapManagementPageState() {
  const ref = useRef<HTMLElement | null>(null);
  const selectedManagementMapSelection = useUIStore((state) => state.selectedManagementMapSelection);
  const mapManagementOverlayOpen = useUIStore((state) => state.mapManagementOverlayOpen);
  const closeManagementOverlay = useUIStore((state) => state.closeManagementOverlay);
  const openManagementOverlay = useUIStore((state) => state.openManagementOverlay);
  const setSelectedManagementMapSelection = useUIStore((state) => state.setSelectedManagementMapSelection);
  const ranchGeometryQuery = useRanchGeometryData();
  const zoneGeometryQuery = useZoneGeometryData();
  const areaGeometryQuery = useAreaGeometryData();
  const {
    data: mapManagement,
    isPending,
    refetch,
  } = useMapManagementData();
  const {
    beginAreaGeometryCreate,
    geometryDraft,
    beginAreaGeometryEdit,
    beginZoneGeometryEdit,
    cancelGeometryEdit,
    finishGeometryDraw,
    handleMapControl,
    isGeometryDrawing,
    isGeometryInteractionActive,
    isRuntimeReady,
    resetGeometryEdit,
    setManagementHoveredSelection,
    setMapLayerVisibility,
    setMapSelectionMode,
  } = useInteractiveMaps(
    'map-management',
    ref,
    {
      areasGeoJson: areaGeometryQuery.data ?? null,
      ranchGeoJson: ranchGeometryQuery.data ?? null,
      zonesGeoJson: zoneGeometryQuery.data ?? null,
    },
    Boolean(mapManagement),
  );
  const updateAreaGeometry = useUpdateAreaGeometryMutation();
  const createArea = useCreateAreaMutation();
  const deleteArea = useDeleteAreaMutation();
  const updateAreaDetails = useUpdateAreaDetailsMutation();
  const updateAreaMetrics = useUpdateAreaMetricsMutation();
  const updateZoneGeometry = useUpdateZoneGeometryMutation();
  const [areaNameInput, setAreaNameInput] = useState('');
  const [densityInput, setDensityInput] = useState('');
  const [treeCountInput, setTreeCountInput] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState<'area' | 'zone'>('zone');
  const [pendingRouteSelection, setPendingRouteSelection] = useState<BakkiMapSelection | null>(null);
  const [showLayerLegend, setShowLayerLegend] = useState(true);
  const [showRanchLayer, setShowRanchLayer] = useState(true);
  const [showZoneLayer, setShowZoneLayer] = useState(true);
  const [showAreaLayer, setShowAreaLayer] = useState(true);
  const [overlayMode, setOverlayMode] = useState<MapManagementOverlayMode>('zone-info');
  const [hoveredAreaId, setHoveredAreaId] = useState<string | null>(null);
  const overlayModeOverrideRef = useRef<MapManagementOverlayMode | null>(null);
  const lastSelectionKeyRef = useRef<string | null>(null);
  const renderState = resolveMapManagementRenderState(mapManagement, isPending);
  const activeSelection = selectedManagementMapSelection;
  const zoneKey = activeSelection?.zoneId ?? null;
  const zoneDetail = zoneKey ? mapManagement?.zonesById[zoneKey] ?? null : null;
  const activeAreaId = activeSelection?.kind === 'area' ? activeSelection.areaId : null;
  const areaDetail = activeAreaId ? mapManagement?.areasById[activeAreaId] ?? null : null;
  const zoneAreas = resolveZoneAreas(mapManagement, zoneKey);
  const fallbackZoneName = activeSelection?.zoneName ?? zoneDetail?.zoneName ?? formatZoneName(zoneKey);
  const effectiveZoneDetail = activeSelection
    ? (
        zoneDetail ?? {
          areaCount: zoneAreas.length,
          areaCountLabel: 'Mapped Areas',
          currentDensityPer100Sqm: null,
          currentTreeCount: null,
          editableAreaId: zoneAreas[0]?.areaId ?? null,
          editableAreaName: zoneAreas[0]?.areaName ?? 'No editable area linked',
          zoneName: fallbackZoneName,
          prominentDensityLabel: 'Current Density',
          prominentDensityValue: 'Unavailable',
          contractFulfillmentLabel: 'Contract Fulfillment',
          contractFulfillmentValue: 'Unavailable',
          currentTreeCountLabel: 'Current Tree Count',
          currentTreeCountValue: 'Unavailable',
          assignedPlanterLabel: 'Assigned Planter',
          assignedPlanterValue: 'Unassigned',
          areaDefinitionStatus: 'Zone summary unavailable.',
          boundaryCoordinates: [],
          notes: 'The map selection is active, but the backend did not return a matching zone summary yet.',
        }
      )
    : null;

  useEffect(() => {
    setMapSelectionMode('management', selectionMode);
  }, [selectionMode, setMapSelectionMode]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handoffSelection = parseMapSelection(
      window.sessionStorage.getItem(MAP_MANAGEMENT_HANDOFF_STORAGE_KEY),
    );
    window.sessionStorage.removeItem(MAP_MANAGEMENT_HANDOFF_STORAGE_KEY);

    if (handoffSelection?.kind === 'area') {
      setPendingRouteSelection(handoffSelection);
    }
  }, []);

  useEffect(() => {
    if (!pendingRouteSelection) {
      return;
    }

    if (
      selectionMode === 'area'
      && mapManagementOverlayOpen
      && isSameMapSelection(activeSelection, pendingRouteSelection)
    ) {
      setPendingRouteSelection(null);
      return;
    }

    overlayModeOverrideRef.current = 'area-edit';
    setSelectionMode('area');
    setSelectedManagementMapSelection(pendingRouteSelection);
    openManagementOverlay(pendingRouteSelection);
  }, [
    activeSelection,
    mapManagementOverlayOpen,
    openManagementOverlay,
    pendingRouteSelection,
    selectionMode,
    setSelectedManagementMapSelection,
  ]);

  useEffect(() => {
    if (selectionMode !== 'zone' || !activeSelection || activeSelection.kind !== 'area') {
      return;
    }

    const nextSelection = buildZoneSummarySelection(activeSelection);
    if (!nextSelection) {
      return;
    }

    overlayModeOverrideRef.current = 'zone-info';
    if (mapManagementOverlayOpen) {
      openManagementOverlay(nextSelection);
      return;
    }

    setSelectedManagementMapSelection(nextSelection);
  }, [
    activeSelection,
    mapManagementOverlayOpen,
    openManagementOverlay,
    selectionMode,
    setSelectedManagementMapSelection,
  ]);

  useEffect(() => {
    setMapLayerVisibility('management', 'ranch', showRanchLayer);
  }, [setMapLayerVisibility, showRanchLayer]);

  useEffect(() => {
    setMapLayerVisibility('management', 'zones', showZoneLayer);
  }, [setMapLayerVisibility, showZoneLayer]);

  useEffect(() => {
    setMapLayerVisibility('management', 'areas', showAreaLayer);
  }, [setMapLayerVisibility, showAreaLayer]);

  useEffect(() => {
    const selectionKey = buildSelectionKey(activeSelection);
    if (selectionKey === lastSelectionKeyRef.current) {
      return;
    }

    lastSelectionKeyRef.current = selectionKey;
    if (!activeSelection) {
      return;
    }

    const nextOverlayMode = overlayModeOverrideRef.current ?? resolveOverlayModeFromSelection(activeSelection);
    overlayModeOverrideRef.current = null;
    setOverlayMode(nextOverlayMode);
    setHoveredAreaId(null);
  }, [activeSelection]);

  useEffect(() => {
    if (!activeSelection || mapManagementOverlayOpen) {
      return;
    }

    openManagementOverlay(activeSelection);
  }, [activeSelection, openManagementOverlay]);

  useEffect(() => {
    if (areaDetail) {
      const nextDraft = createAreaMetricsDraft(areaDetail);
      setAreaNameInput(areaDetail.areaName);
      setDensityInput(nextDraft.densityInput);
      setTreeCountInput(nextDraft.treeCountInput);
      return;
    }

    if (activeSelection?.kind === 'area') {
      setAreaNameInput(activeSelection.areaName ?? '');
      setDensityInput('');
      setTreeCountInput('');
      return;
    }

    if (!zoneDetail) {
      return;
    }

    setAreaNameInput(resolveAreaNameDraft({
      areaCount: zoneDetail.areaCount,
      areaName: zoneDetail.editableAreaName !== 'No editable area linked' ? undefined : null,
      zoneName: zoneDetail.zoneName,
    }));
    setDensityInput('');
    setTreeCountInput('');
  }, [
    activeSelection?.areaName,
    activeSelection?.kind,
    areaDetail?.areaId,
    areaDetail?.areaName,
    areaDetail?.currentDensityPer100Sqm,
    areaDetail?.currentTreeCount,
    zoneDetail?.areaCount,
    zoneDetail?.zoneName,
  ]);

  useEffect(() => {
    if (!hoveredAreaId) {
      setManagementHoveredSelection(null);
      return;
    }

    const hoveredArea = mapManagement?.areasById[hoveredAreaId];
    if (!hoveredArea) {
      setManagementHoveredSelection(null);
      return;
    }

    setManagementHoveredSelection({
      kind: 'area',
      zoneId: hoveredArea.zoneId,
      zoneName: hoveredArea.zoneName,
      areaId: hoveredArea.areaId,
      areaName: hoveredArea.areaName,
    });
  }, [hoveredAreaId, mapManagement, setManagementHoveredSelection]);

  const openManagementSelection = (
    selection: BakkiMapSelection,
    options?: {
      cancelGeometryDraft?: boolean;
      overlayMode?: MapManagementOverlayMode;
      selectionMode?: 'area' | 'zone';
    },
  ) => {
    if (options?.cancelGeometryDraft) {
      cancelGeometryEdit();
    }

    if (options?.selectionMode) {
      setSelectionMode(options.selectionMode);
    }

    if (options?.overlayMode) {
      overlayModeOverrideRef.current = options.overlayMode;
      setOverlayMode(options.overlayMode);
    }

    setHoveredAreaId(null);
    setSelectedManagementMapSelection(selection);
    openManagementOverlay(selection);
  };

  const handleCloseManagementOverlay = () => {
    cancelGeometryEdit();
    setHoveredAreaId(null);
    closeManagementOverlay();
  };

  const handleOpenZoneInfoCard = () => {
    const nextSelection = buildZoneSummarySelection(activeSelection);
    if (!nextSelection) {
      return;
    }

    setSaveError(null);
    setSaveSuccess(null);
    openManagementSelection(nextSelection, {
      cancelGeometryDraft: true,
      overlayMode: 'zone-info',
      selectionMode: 'zone',
    });
  };

  const handleOpenEditAreasCard = () => {
    if (!activeSelection) {
      return;
    }

    setSaveError(null);
    setSaveSuccess(null);
    cancelGeometryEdit();
    setHoveredAreaId(null);
    setSelectionMode('area');
    setOverlayMode('edit-areas');
  };

  const handleOpenCreateAreaCard = () => {
    const nextSelection = buildZoneSummarySelection(activeSelection);
    if (!nextSelection) {
      return;
    }

    setSaveError(null);
    setSaveSuccess(null);
    openManagementSelection(nextSelection, {
      cancelGeometryDraft: true,
      overlayMode: 'create-area',
      selectionMode: 'zone',
    });
  };

  const handleOpenAreaEditor = (areaId: string, areaName: string) => {
    if (!zoneKey) {
      return;
    }

    setSaveError(null);
    setSaveSuccess(null);
    openManagementSelection({
      kind: 'area',
      zoneId: zoneKey,
      zoneName: zoneDetail?.zoneName ?? activeSelection?.zoneName ?? 'Zone',
      areaId,
      areaName,
    }, {
      selectionMode: 'area',
    });
  };

  const editorState = buildMapManagementEditorState({
    activeSelection,
    areaGeometry: areaGeometryQuery.data,
    areaDetail,
    areaNameInput,
    beginAreaGeometryCreate,
    beginAreaGeometryEdit,
    beginZoneGeometryEdit,
    cancelGeometryEdit,
    createArea,
    deleteArea,
    densityInput,
    finishGeometryDraw,
    geometryDraft,
    isGeometryDrawing,
    isGeometryInteractionActive,
    openManagementSelection,
    overlayMode,
    resetGeometryEdit,
    setSaveError,
    setSaveSuccess,
    treeCountInput,
    updateAreaDetails,
    updateAreaGeometry,
    updateAreaMetrics,
    updateZoneGeometry,
    zoneGeometry: zoneGeometryQuery.data,
    zoneKey,
    zoneDetail: effectiveZoneDetail,
  });

  const isOverlayVisible = mapManagementOverlayOpen && Boolean(activeSelection);

  return {
    activeSelection,
    areaDetail,
    areaDefinitionStatus: editorState.areaDefinitionStatus,
    areaNameInput,
    boundaryCoordinates: editorState.boundaryCoordinates,
    closeManagementOverlay: handleCloseManagementOverlay,
    densityInput,
    editableAreaName: editorState.editableAreaName,
    handleFinishGeometryDraw: editorState.handleFinishGeometryDraw,
    handleBoundaryResetToolClick: editorState.handleBoundaryResetToolClick,
    handleBoundaryStopToolClick: editorState.handleBoundaryStopToolClick,
    handleBoundaryToolClick: editorState.handleBoundaryToolClick,
    handleCreateArea: editorState.handleCreateArea,
    handleDeleteArea: editorState.handleDeleteArea,
    handleMapControl,
    handleOpenAreaEditor,
    handleOpenCreateAreaCard,
    handleOpenEditAreasCard,
    handleOpenZoneInfoCard,
    handleSave: editorState.handleSave,
    hasAnyDraftChanges: editorState.hasAnyDraftChanges,
    hasEditableArea: editorState.hasEditableArea,
    hasGeometryDraftChanges: editorState.hasGeometryDraftChanges,
    hoveredAreaId,
    isAreaSelection: editorState.isAreaSelection,
    isCreatingArea: editorState.isCreatingArea,
    isDeletingArea: editorState.isDeletingArea,
    isGeometryDrawing: editorState.isGeometryDrawing,
    isGeometryEditing: editorState.isGeometryEditing,
    isOverlayVisible,
    isRuntimeReady,
    isSaving: editorState.isSaving,
    mapManagement,
    notesValue: editorState.notesValue,
    overlayMode,
    ref,
    refetch,
    renderState,
    saveError,
    saveSuccess,
    selectedLayerLabel: editorState.selectedLayerLabel,
    selectionMode,
    setAreaNameInput,
    setDensityInput,
    setHoveredAreaId,
    setSelectionMode,
    setShowAreaLayer,
    setShowLayerLegend,
    setShowRanchLayer,
    setShowZoneLayer,
    setTreeCountInput,
    showAreaLayer,
    showLayerLegend,
    showRanchLayer,
    showZoneLayer,
    treeCountInput,
    zoneAreas,
    zoneDetail: effectiveZoneDetail,
    zoneKey,
    zoneName: editorState.zoneName,
  };
}
