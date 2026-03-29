import type {
  AreaGeometryProperties,
  CreateAreaRequest,
  CreateAreaResponse,
  DeleteAreaResponse,
  GeoJsonFeatureCollection,
  UpdateAreaDetailsRequest,
  UpdateAreaDetailsResponse,
  UpdateAreaGeometryRequest,
  UpdateAreaGeometryResponse,
  UpdateAreaMetricsRequest,
  UpdateAreaMetricsResponse,
  UpdateZoneGeometryRequest,
  UpdateZoneGeometryResponse,
  ZoneGeometryProperties,
} from '@bakki/domain';
import type { BakkiMapGeometryDraft, BakkiMapSelection } from '@bakki/map';
import {
  buildAreaCreatedSuccessMessage,
  buildAreaDeletedSuccessMessage,
  buildAreaDetailsSuccessMessage,
  buildAreaGeometrySuccessMessage,
  buildAreaMetricsSuccessMessage,
  buildAreaMetricsUpdatePayload,
  buildZoneGeometrySuccessMessage,
  createAreaMetricsDraft,
  formatBoundaryCoordinatesFromGeometry,
  formatZoneName,
  type MapManagementOverlayMode,
  validateAreaNameInput,
} from './map-management.utils';

interface MapManagementMutation<TVariables, TResponse> {
  isPending: boolean;
  mutateAsync: (variables: TVariables) => Promise<TResponse>;
}

interface BuildMapManagementEditorStateParams {
  activeSelection: BakkiMapSelection | null;
  areaDetail: import('@bakki/domain').MapManagementAreaFixture | null;
  areaGeometry: GeoJsonFeatureCollection<AreaGeometryProperties> | null | undefined;
  areaNameInput: string;
  beginAreaGeometryCreate: (zoneId: string, zoneName?: string | null) => boolean;
  beginAreaGeometryEdit: (areaId: string) => boolean;
  beginZoneGeometryEdit: (zoneId: string) => boolean;
  cancelGeometryEdit: () => void;
  createArea: MapManagementMutation<CreateAreaRequest, CreateAreaResponse>;
  deleteArea: MapManagementMutation<string, DeleteAreaResponse>;
  densityInput: string;
  finishGeometryDraw: () => boolean;
  geometryDraft: BakkiMapGeometryDraft | null;
  isGeometryDrawing: boolean;
  isGeometryInteractionActive: boolean;
  openManagementSelection: (
    selection: BakkiMapSelection,
    options?: {
      cancelGeometryDraft?: boolean;
      overlayMode?: MapManagementOverlayMode;
      selectionMode?: 'area' | 'zone';
    },
  ) => void;
  overlayMode: MapManagementOverlayMode;
  resetGeometryEdit: () => void;
  setSaveError: (value: string | null) => void;
  setSaveSuccess: (value: string | null) => void;
  treeCountInput: string;
  updateAreaDetails: MapManagementMutation<
    { areaId: string; payload: UpdateAreaDetailsRequest },
    UpdateAreaDetailsResponse
  >;
  updateAreaGeometry: MapManagementMutation<
    { areaId: string; payload: UpdateAreaGeometryRequest },
    UpdateAreaGeometryResponse
  >;
  updateAreaMetrics: MapManagementMutation<
    { areaId: string; payload: UpdateAreaMetricsRequest },
    UpdateAreaMetricsResponse
  >;
  updateZoneGeometry: MapManagementMutation<
    { payload: UpdateZoneGeometryRequest; zoneId: string },
    UpdateZoneGeometryResponse
  >;
  zoneGeometry: GeoJsonFeatureCollection<ZoneGeometryProperties> | null | undefined;
  zoneKey: string | null;
  zoneDetail: import('@bakki/domain').MapManagementZoneFixture | null;
}

function resolveActiveGeometryDraft(
  selection: BakkiMapSelection | null,
  geometryDraft: BakkiMapGeometryDraft | null,
  overlayMode: MapManagementOverlayMode,
) {
  if (!selection || !geometryDraft) {
    return null;
  }

  if (overlayMode === 'create-area') {
    return geometryDraft.kind === 'new-area' && geometryDraft.zoneId === selection.zoneId
      ? geometryDraft
      : null;
  }

  if (selection.kind === 'area' && selection.areaId) {
    return geometryDraft.kind === 'area' && geometryDraft.areaId === selection.areaId
      ? geometryDraft
      : null;
  }

  return geometryDraft.kind === 'zone' && geometryDraft.zoneId === selection.zoneId
    ? geometryDraft
    : null;
}

function findAreaGeometry(
  areaGeometry: GeoJsonFeatureCollection<AreaGeometryProperties> | null | undefined,
  areaId: string | null | undefined,
) {
  if (!areaId) {
    return null;
  }

  return areaGeometry?.features.find(
    (feature) => feature.properties.areaRef === areaId,
  )?.geometry ?? null;
}

function findZoneGeometry(
  zoneGeometry: GeoJsonFeatureCollection<ZoneGeometryProperties> | null | undefined,
  zoneId: string | null | undefined,
) {
  if (!zoneId) {
    return null;
  }

  return zoneGeometry?.features.find(
    (feature) => feature.properties.id === zoneId,
  )?.geometry ?? null;
}

function buildZoneSelection(
  selection: BakkiMapSelection | null,
  zoneKey: string | null,
  zoneName: string,
): BakkiMapSelection | null {
  const normalizedZoneId = zoneKey ?? selection?.zoneId ?? null;
  if (!normalizedZoneId) {
    return null;
  }

  return {
    kind: 'zone',
    zoneId: normalizedZoneId,
    zoneName,
    areaId: null,
    areaName: null,
  };
}

export function buildMapManagementEditorState({
  activeSelection,
  areaDetail,
  areaGeometry,
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
  zoneGeometry,
  zoneKey,
  zoneDetail,
}: BuildMapManagementEditorStateParams) {
  const zoneName = activeSelection?.zoneName ?? zoneDetail?.zoneName ?? formatZoneName(zoneKey);
  const isAreaSelection = activeSelection?.kind === 'area';
  const isZoneSelection = activeSelection?.kind === 'zone';
  const selectedAreaId = isAreaSelection ? activeSelection.areaId ?? null : null;
  const activeGeometryDraft = resolveActiveGeometryDraft(activeSelection, geometryDraft, overlayMode);
  const persistedAreaGeometryCoordinates = formatBoundaryCoordinatesFromGeometry(
    findAreaGeometry(areaGeometry, selectedAreaId),
  );
  const persistedZoneGeometryCoordinates = formatBoundaryCoordinatesFromGeometry(
    findZoneGeometry(zoneGeometry, zoneKey),
  );
  const boundaryCoordinates = overlayMode === 'create-area'
    ? activeGeometryDraft?.boundaryCoordinates ?? []
    : isAreaSelection
      ? (
          activeGeometryDraft?.boundaryCoordinates.length
            ? activeGeometryDraft.boundaryCoordinates
            : persistedAreaGeometryCoordinates.length
              ? persistedAreaGeometryCoordinates
              : []
        )
      : (
          activeGeometryDraft?.boundaryCoordinates.length
            ? activeGeometryDraft.boundaryCoordinates
            : persistedZoneGeometryCoordinates.length
              ? persistedZoneGeometryCoordinates
              : zoneDetail?.boundaryCoordinates ?? []
        );
  const initialMetricsDraft = areaDetail ? createAreaMetricsDraft(areaDetail) : null;
  const initialDensityInput = initialMetricsDraft?.densityInput ?? '';
  const initialTreeCountInput = initialMetricsDraft?.treeCountInput ?? '';
  const hasMetricsDraftChanges = isAreaSelection
    && Boolean(initialMetricsDraft)
    && (
      densityInput !== initialDensityInput
      || treeCountInput !== initialTreeCountInput
    );
  const hasAreaNameDraftChanges = isAreaSelection
    && Boolean(areaDetail)
    && areaNameInput.trim() !== (areaDetail?.areaName ?? '');
  const hasGeometryDraftChanges = overlayMode === 'create-area'
    ? Boolean(activeGeometryDraft)
    : Boolean(activeGeometryDraft?.isDirty);
  const hasAnyDraftChanges = overlayMode === 'create-area'
    ? Boolean(activeGeometryDraft) || Boolean(areaNameInput.trim())
    : hasMetricsDraftChanges || hasGeometryDraftChanges || hasAreaNameDraftChanges;
  const isSaving =
    updateAreaDetails.isPending
    || updateAreaMetrics.isPending
    || updateAreaGeometry.isPending
    || updateZoneGeometry.isPending;
  const isCreatingArea = createArea.isPending;
  const isDeletingArea = deleteArea.isPending;
  const editableAreaName = overlayMode === 'create-area'
    ? areaNameInput.trim() || 'New area'
    : (
        areaDetail?.areaName
        ?? activeSelection?.areaName
        ?? areaNameInput.trim()
        ?? zoneDetail?.editableAreaName
        ?? 'Area'
      );
  const selectedLayerLabel = activeSelection
    ? activeSelection.kind === 'area'
      ? 'Selected Area'
      : 'Selected Zone'
    : 'Selection';
  const isGeometryEditing = isGeometryInteractionActive;
  const areaDefinitionStatus = overlayMode === 'create-area'
    ? activeGeometryDraft
      ? isGeometryDrawing
        ? 'Finish drawing to close the new area polygon'
        : 'New area draft ready'
      : isGeometryEditing
        ? 'Click inside the selected zone to place the new boundary'
        : 'No area draft drawn'
    : isGeometryEditing
      ? hasGeometryDraftChanges
        ? `${isAreaSelection ? 'Area' : 'Zone'} boundary draft updated`
        : `${isAreaSelection ? 'Area' : 'Zone'} boundary edit active`
      : isAreaSelection
        ? areaDetail?.areaDefinitionStatus ?? 'Unknown'
        : zoneDetail?.areaDefinitionStatus ?? 'Unknown';
  const notesValue = overlayMode === 'create-area'
    ? activeGeometryDraft
      ? isGeometryDrawing
        ? 'Click inside the selected zone to place each point, then use Finish Drawing to close the polygon.'
        : 'Refine the new area boundary on the map, confirm the name, then create the area in Bakki Core.'
      : 'Use the draw action in this card to sketch a new area. Only clicks inside the selected zone are accepted.'
    : isAreaSelection && areaDetail
      ? `${areaDetail.notes} ${isGeometryEditing ? 'Drag the selected area vertices on the map to refine the boundary, then save changes.' : 'Use the boundary tool to adjust the selected area on the map.'}`.trim()
      : zoneDetail
        ? `${zoneDetail.notes} ${isGeometryEditing ? 'Drag the selected zone vertices on the map to refine the boundary, then save changes.' : 'Use the boundary tool to adjust the selected zone on the map.'}`.trim()
        : '';

  const handleSave = async () => {
    if (overlayMode === 'create-area') {
      if (!activeSelection) {
        setSaveError('Select a zone before creating an area.');
        return;
      }

      const normalizedAreaName = validateAreaNameInput(areaNameInput);
      if (!normalizedAreaName.ok) {
        setSaveError(normalizedAreaName.error);
        return;
      }

      if (!zoneKey) {
        setSaveError('Select a zone before creating an area.');
        return;
      }

      if (!activeGeometryDraft || activeGeometryDraft.kind !== 'new-area') {
        setSaveError('Draw the new area boundary on the map before creating it.');
        return;
      }

      if (isGeometryDrawing) {
        setSaveError('Finish drawing the new area boundary before creating the area.');
        return;
      }

      setSaveError(null);
      setSaveSuccess(null);

      try {
        const result = await createArea.mutateAsync({
          geometry: activeGeometryDraft.geometry,
          name: normalizedAreaName.value,
          zoneId: zoneKey,
        });
        const nextSelection = {
          kind: 'area' as const,
          zoneId: zoneKey,
          zoneName,
          areaId: result.areaId,
          areaName: result.areaName,
        };
        openManagementSelection(nextSelection, {
          cancelGeometryDraft: true,
          selectionMode: 'area',
        });
        setSaveSuccess(buildAreaCreatedSuccessMessage(result.areaName));
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : 'Area could not be created.');
      }

      return;
    }

    if (!activeSelection) {
      setSaveError('Select a zone or area before saving changes.');
      return;
    }

    if (isZoneSelection) {
      if (!zoneKey) {
        setSaveError('Select a zone before saving changes.');
        return;
      }

      if (!activeGeometryDraft || activeGeometryDraft.kind !== 'zone') {
        setSaveError('Start zone boundary editing before saving changes.');
        return;
      }

      if (!activeGeometryDraft.isDirty) {
        setSaveError('Adjust the zone boundary before saving changes.');
        return;
      }

      setSaveError(null);
      setSaveSuccess(null);

      try {
        const result = await updateZoneGeometry.mutateAsync({
          payload: {
            geometry: activeGeometryDraft.geometry,
          },
          zoneId: zoneKey,
        });
        cancelGeometryEdit();
        setSaveSuccess(buildZoneGeometrySuccessMessage(result.zoneName));
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : 'Zone changes could not be saved.');
      }

      return;
    }

    if (!isAreaSelection || !selectedAreaId || !areaDetail) {
      setSaveError('Select an area before saving changes.');
      return;
    }

    if (!hasAnyDraftChanges) {
      setSaveError('Adjust the area name, density, tree count, or boundary before saving changes.');
      return;
    }

    const normalizedAreaName = validateAreaNameInput(areaNameInput);
    if (!normalizedAreaName.ok) {
      setSaveError(normalizedAreaName.error);
      return;
    }

    const normalizedMetricsUpdate = hasMetricsDraftChanges
      ? buildAreaMetricsUpdatePayload(densityInput, treeCountInput)
      : null;
    if (normalizedMetricsUpdate && !normalizedMetricsUpdate.ok) {
      setSaveError(normalizedMetricsUpdate.error);
      return;
    }

    setSaveError(null);
    setSaveSuccess(null);

    try {
      const successMessages: string[] = [];

      if (hasAreaNameDraftChanges) {
        const detailsResult = await updateAreaDetails.mutateAsync({
          areaId: selectedAreaId,
          payload: {
            name: normalizedAreaName.value,
          },
        });
        successMessages.push(buildAreaDetailsSuccessMessage(detailsResult.areaName));
      }

      if (activeGeometryDraft?.kind === 'area' && activeGeometryDraft.isDirty) {
        const geometryResult = await updateAreaGeometry.mutateAsync({
          areaId: selectedAreaId,
          payload: {
            geometry: activeGeometryDraft.geometry,
          },
        });
        cancelGeometryEdit();
        successMessages.push(buildAreaGeometrySuccessMessage(geometryResult.areaName));
      }

      if (normalizedMetricsUpdate?.ok) {
        const metricsResult = await updateAreaMetrics.mutateAsync({
          areaId: selectedAreaId,
          payload: normalizedMetricsUpdate.payload,
        });
        successMessages.push(
          buildAreaMetricsSuccessMessage(metricsResult.areaName, metricsResult.densityPer100Sqm),
        );
      }

      openManagementSelection({
        kind: 'area',
        zoneId: activeSelection.zoneId,
        zoneName,
        areaId: selectedAreaId,
        areaName: normalizedAreaName.value,
      }, {
        selectionMode: 'area',
      });
      setSaveSuccess(successMessages.join(' '));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Area changes could not be saved.');
    }
  };

  const handleCreateArea = async () => {
    await handleSave();
  };

  const handleDeleteArea = async () => {
    if (!isAreaSelection || !selectedAreaId || !areaDetail) {
      setSaveError('Select an area before deleting it.');
      return;
    }

    const zoneSelection = buildZoneSelection(activeSelection, zoneKey, zoneName);
    if (!zoneSelection) {
      setSaveError('Select a zone before deleting an area.');
      return;
    }

    setSaveError(null);
    setSaveSuccess(null);

    try {
      const result = await deleteArea.mutateAsync(selectedAreaId);
      openManagementSelection(zoneSelection, {
        cancelGeometryDraft: true,
        overlayMode: 'edit-areas',
        selectionMode: 'zone',
      });
      setSaveSuccess(buildAreaDeletedSuccessMessage(result.areaName));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Area could not be deleted.');
    }
  };

  const handleBoundaryToolClick = () => {
    if (!activeSelection || isGeometryEditing) {
      return;
    }

    const didBeginEdit = overlayMode === 'create-area'
      ? beginAreaGeometryCreate(activeSelection.zoneId, zoneName)
      : activeSelection.kind === 'area'
        ? activeSelection.areaId
          ? beginAreaGeometryEdit(activeSelection.areaId)
          : false
        : beginZoneGeometryEdit(activeSelection.zoneId);

    if (didBeginEdit) {
      setSaveError(null);
      setSaveSuccess(null);
    }
  };

  const handleBoundaryResetToolClick = () => {
    if (!isGeometryEditing) {
      return;
    }

    resetGeometryEdit();
    setSaveError(null);
    setSaveSuccess(null);
  };

  const handleBoundaryStopToolClick = () => {
    if (!isGeometryEditing) {
      return;
    }

    cancelGeometryEdit();
    setSaveError(null);
    setSaveSuccess(null);
  };

  const handleFinishGeometryDraw = () => {
    if (overlayMode !== 'create-area' || !isGeometryEditing || !isGeometryDrawing) {
      return;
    }

    const didFinishDraw = finishGeometryDraw();
    if (didFinishDraw) {
      setSaveError(null);
      setSaveSuccess(null);
      return;
    }

    setSaveError('Add at least three points inside the selected zone before finishing the new area.');
  };

  return {
    areaDefinitionStatus,
    boundaryCoordinates,
    editableAreaName,
    handleFinishGeometryDraw,
    handleBoundaryResetToolClick,
    handleBoundaryStopToolClick,
    handleBoundaryToolClick,
    handleCreateArea,
    handleDeleteArea,
    handleSave,
    hasAnyDraftChanges,
    hasEditableArea: Boolean(selectedAreaId),
    hasGeometryDraftChanges,
    isAreaSelection,
    isCreatingArea,
    isDeletingArea,
    isGeometryDrawing,
    isGeometryEditing,
    isSaving,
    notesValue,
    selectedLayerLabel,
    zoneName,
  };
}
