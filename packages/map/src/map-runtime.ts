import KML from 'ol/format/KML';
import GeoJSON from 'ol/format/GeoJSON';
import Draw from 'ol/interaction/Draw';
import Modify from 'ol/interaction/Modify';
import Map from 'ol/Map';
import View from 'ol/View';
import { unlistenByKey, type EventsKey } from 'ol/events';
import { noModifierKeys } from 'ol/events/condition';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import { transform } from 'ol/proj';
import { Geometry } from 'ol/geom';
import type Feature from 'ol/Feature';
import { isEmpty as isExtentEmpty, type Extent } from 'ol/extent';
import { applyFeatureMetadata } from './map-feature-data';
import {
  extractFirstLinearRing,
  formatBoundaryCoordinates,
  readFeatures,
  readGeometry,
  writeGeometry,
} from './map-geometry';
import { resolveAreaSelection, resolveZoneSelection } from './map-selection';
import {
  createAreaEditStyle,
  createAreaStyle,
  createRanchStyle,
  createZoneStyle,
} from './map-styles';
import type { BakkiMapHandle, BakkiMapSelection, CreateBakkiMapOptions } from './types';

export function createBakkiMap({
  areasGeoJson,
  target,
  ranchGeoJson,
  ranchKml,
  zonesGeoJson,
  zonesKml,
  mode,
  onGeometryDraftChange,
  onGeometryDrawingChange,
  onGeometryInteractionChange,
  onPointerCoordinate,
  onSelectionChange,
}: CreateBakkiMapOptions): BakkiMapHandle {
  const kmlFormat = new KML({ extractStyles: false });
  const geoJsonFormat = new GeoJSON();
  const ranchSource = new VectorSource();
  const areaSource = new VectorSource();
  const geometryEditSource = new VectorSource();
  const zoneSource = new VectorSource();

  const ranchLayer = new VectorLayer({
    source: ranchSource,
    style: createRanchStyle(),
  });
  let selectedZoneId: string | null = null;
  let selectedAreaId: string | null = null;
  let hoveredZoneId: string | null = null;
  let hoveredAreaId: string | null = null;
  let externallyHoveredZoneId: string | null = null;
  let externallyHoveredAreaId: string | null = null;
  let editingGeometryId: string | null = null;
  let editingGeometryKind: 'area' | 'zone' | 'new-area' | null = null;
  let editingGeometryOriginalJson: string | null = null;
  let editingGeometryLastValidJson: string | null = null;
  let editingZoneName: string | null = null;
  let activeCreationZoneGeometry: Geometry | null = null;
  let activeSketchFeature: Feature<Geometry> | null = null;
  let activeSketchGeometryKey: EventsKey | null = null;
  let editableFeatureChangeKey: EventsKey | null = null;
  let isRestoringGeometry = false;
  let selectionMode: 'area' | 'zone' = 'area';
  const areaLayer = new VectorLayer({
    source: areaSource,
    style: (feature) => createAreaStyle(
      feature as Feature<Geometry>,
      selectedAreaId,
      mode,
      editingGeometryKind === 'area' ? editingGeometryId : null,
      externallyHoveredAreaId ?? hoveredAreaId,
    ),
  });
  const geometryEditLayer = new VectorLayer({
    source: geometryEditSource,
    style: createAreaEditStyle(),
  });
  const zoneLayer = new VectorLayer({
    source: zoneSource,
    style: (feature) => createZoneStyle(
      feature as Feature<Geometry>,
      selectedZoneId,
      mode,
      editingGeometryKind === 'zone' ? editingGeometryId : null,
      externallyHoveredZoneId ?? hoveredZoneId,
    ),
  });
  const modifyInteraction = new Modify({
    source: geometryEditSource,
  });
  modifyInteraction.setActive(false);
  const drawInteraction = new Draw({
    condition(event) {
      if (!noModifierKeys(event)) {
        return false;
      }

      if (!activeCreationZoneGeometry || editingGeometryKind !== 'new-area') {
        return true;
      }

      return activeCreationZoneGeometry.intersectsCoordinate(event.coordinate);
    },
    source: geometryEditSource,
    type: 'Polygon',
  });
  drawInteraction.setActive(false);

  const map = new Map({
    target,
    layers: [
      new TileLayer({
        source: new OSM(),
        preload: Infinity,
      }),
      ranchLayer,
      areaLayer,
      geometryEditLayer,
      zoneLayer,
    ],
    controls: [],
    view: new View({
      center: transform([-23.4891, 65.8425], 'EPSG:4326', 'EPSG:3857'),
      zoom: 12,
      enableRotation: false,
    }),
  });
  map.addInteraction(modifyInteraction);
  map.addInteraction(drawInteraction);

  let currentExtent: Extent | null = zoneSource.getExtent() ?? null;
  const resizeObserver = typeof ResizeObserver !== 'undefined'
    ? new ResizeObserver(() => map.updateSize())
    : null;
  resizeObserver?.observe(target);
  const handlePointerLeave = () => {
    setHoveredFeatureState(null, null);
  };
  target.addEventListener('pointerleave', handlePointerLeave);

  const fitToExtent = () => {
    if (currentExtent && !isExtentEmpty(currentExtent)) {
      map.getView().fit(currentExtent, { padding: [56, 56, 56, 56], maxZoom: 13.8, duration: 0 });
    }
  };

  const applyHoveredFeatureState = () => {
    const effectiveZoneId = externallyHoveredZoneId ?? hoveredZoneId;
    const effectiveAreaId = externallyHoveredAreaId ?? hoveredAreaId;
    zoneLayer.changed();
    areaLayer.changed();
    target.style.cursor = hoveredZoneId || hoveredAreaId ? 'pointer' : '';
    return { effectiveAreaId, effectiveZoneId };
  };

  const setHoveredFeatureState = (nextZoneId: string | null, nextAreaId: string | null) => {
    if (hoveredZoneId === nextZoneId && hoveredAreaId === nextAreaId) {
      return;
    }

    hoveredZoneId = nextZoneId;
    hoveredAreaId = nextAreaId;
    applyHoveredFeatureState();
  };

  const setExternalHoveredFeatureState = (nextZoneId: string | null, nextAreaId: string | null) => {
    if (externallyHoveredZoneId === nextZoneId && externallyHoveredAreaId === nextAreaId) {
      return;
    }

    externallyHoveredZoneId = nextZoneId;
    externallyHoveredAreaId = nextAreaId;
    applyHoveredFeatureState();
  };

  const setGeometryInteractionState = (isActive: boolean) => {
    onGeometryInteractionChange?.(isActive);
  };

  const setGeometryDrawingState = (isDrawing: boolean) => {
    onGeometryDrawingChange?.(isDrawing);
  };

  const clearSketchFeature = () => {
    if (activeSketchGeometryKey) {
      unlistenByKey(activeSketchGeometryKey);
      activeSketchGeometryKey = null;
    }
    activeSketchFeature = null;
  };

  const isGeometryInsideActiveZone = (geometry: Geometry) => {
    if (!activeCreationZoneGeometry) {
      return true;
    }

    const ring = extractFirstLinearRing(writeGeometry(geoJsonFormat, geometry).coordinates);
    if (ring.length < 3) {
      return false;
    }

    const isCoordinateInsideZone = (coordinate: number[]) => {
      const projectedCoordinate = transform([coordinate[0], coordinate[1]], 'EPSG:4326', 'EPSG:3857');
      return activeCreationZoneGeometry?.intersectsCoordinate(projectedCoordinate) ?? false;
    };

    for (const coordinate of ring) {
      if (!isCoordinateInsideZone(coordinate)) {
        return false;
      }
    }

    for (let index = 0; index < ring.length - 1; index += 1) {
      const current = ring[index];
      const next = ring[index + 1];
      for (const ratio of [0.25, 0.5, 0.75]) {
        const sample = [
          current[0] + ((next[0] - current[0]) * ratio),
          current[1] + ((next[1] - current[1]) * ratio),
        ];
        if (!isCoordinateInsideZone(sample)) {
          return false;
        }
      }
    }

    return true;
  };

  const emitGeometryDraftChangeForFeature = (editFeature: Feature<Geometry> | null | undefined) => {
    const geometry = editFeature?.getGeometry();
    if (!editFeature || !geometry || !editingGeometryId || !editingGeometryKind) {
      onGeometryDraftChange?.(null);
      return;
    }

    const geoJsonGeometry = writeGeometry(geoJsonFormat, geometry);
    onGeometryDraftChange?.({
      areaName: (editFeature.get('areaName') as string | undefined) ?? null,
      boundaryCoordinates: formatBoundaryCoordinates(geoJsonGeometry.coordinates),
      geometry: geoJsonGeometry,
      kind: editingGeometryKind,
      isDirty:
        editingGeometryKind === 'new-area'
          ? true
          : JSON.stringify(geoJsonGeometry) !== editingGeometryOriginalJson,
      areaId:
        editingGeometryKind === 'area'
          ? editingGeometryId
          : ((editFeature.get('areaId') as string | undefined) ?? null),
      zoneId: (editFeature.get('zoneId') as string | undefined) ?? null,
      zoneName: (editFeature.get('zoneName') as string | undefined) ?? editingZoneName,
    });
  };

  const emitGeometryDraftChange = () => {
    emitGeometryDraftChangeForFeature(activeSketchFeature ?? geometryEditSource.getFeatures()[0]);
  };

  const attachEditableFeature = (feature: Feature<Geometry>) => {
    if (editableFeatureChangeKey) {
      unlistenByKey(editableFeatureChangeKey);
      editableFeatureChangeKey = null;
    }
    const geometry = feature.getGeometry();
    if (!geometry) {
      return;
    }
    editableFeatureChangeKey = geometry.on('change', () => {
      if (
        editingGeometryKind === 'new-area'
        && !isRestoringGeometry
        && feature.getGeometry()
        && !isGeometryInsideActiveZone(feature.getGeometry()!)
      ) {
        if (editingGeometryLastValidJson) {
          isRestoringGeometry = true;
          feature.setGeometry(readGeometry(geoJsonFormat, JSON.parse(editingGeometryLastValidJson)));
          isRestoringGeometry = false;
        }
        geometryEditLayer.changed();
        return;
      }

      if (editingGeometryKind === 'new-area' && feature.getGeometry()) {
        editingGeometryLastValidJson = JSON.stringify(writeGeometry(geoJsonFormat, feature.getGeometry()!));
      }

      emitGeometryDraftChange();
      geometryEditLayer.changed();
    });
  };

  const clearGeometryEdit = () => {
    drawInteraction.abortDrawing();
    clearSketchFeature();
    if (editableFeatureChangeKey) {
      unlistenByKey(editableFeatureChangeKey);
      editableFeatureChangeKey = null;
    }
    editingGeometryId = null;
    editingGeometryKind = null;
    editingGeometryOriginalJson = null;
    editingGeometryLastValidJson = null;
    editingZoneName = null;
    activeCreationZoneGeometry = null;
    geometryEditSource.clear(true);
    modifyInteraction.setActive(false);
    drawInteraction.setActive(false);
    setGeometryInteractionState(false);
    setGeometryDrawingState(false);
    areaLayer.changed();
    zoneLayer.changed();
    onGeometryDraftChange?.(null);
  };

  const beginGeometryEdit = (kind: 'area' | 'zone', id: string) => {
    if (!id) {
      return false;
    }

    if (editingGeometryKind === kind && editingGeometryId === id && geometryEditSource.getFeatures().length > 0) {
      return true;
    }

    const sourceFeature = (
      kind === 'area'
        ? areaSource.getFeatures().find((candidate) => candidate.get('areaId') === id)
        : zoneSource.getFeatures().find((candidate) => candidate.get('zoneId') === id)
    ) as Feature<Geometry> | undefined;
    const sourceGeometry = sourceFeature?.getGeometry();
    if (!sourceFeature || !sourceGeometry) {
      return false;
    }

    clearGeometryEdit();
    const editFeature = sourceFeature.clone() as Feature<Geometry>;
    geometryEditSource.addFeature(editFeature);
    editingGeometryId = id;
    editingGeometryKind = kind;
    editingGeometryOriginalJson = JSON.stringify(writeGeometry(geoJsonFormat, editFeature.getGeometry()!));
    editingZoneName = (editFeature.get('zoneName') as string | undefined) ?? null;
    attachEditableFeature(editFeature);
    modifyInteraction.setActive(true);
    setGeometryInteractionState(true);
    setGeometryDrawingState(false);
    areaLayer.changed();
    zoneLayer.changed();
    emitGeometryDraftChange();
    return true;
  };

  const beginAreaCreation = (zoneId: string, zoneName?: string | null) => {
    if (!zoneId) {
      return false;
    }

    const zoneFeature = zoneSource.getFeatures().find(
      (candidate) => candidate.get('zoneId') === zoneId,
    ) as Feature<Geometry> | undefined;
    const zoneBoundaryGeometry = zoneFeature?.getGeometry();
    if (!zoneFeature || !zoneBoundaryGeometry) {
      return false;
    }

    clearGeometryEdit();
    editingGeometryId = zoneId;
    editingGeometryKind = 'new-area';
    editingZoneName = zoneName ?? null;
    activeCreationZoneGeometry = zoneBoundaryGeometry.clone();
    drawInteraction.setActive(true);
    setGeometryInteractionState(true);
    setGeometryDrawingState(false);
    areaLayer.changed();
    zoneLayer.changed();
    return true;
  };

  const applyData = ({
    nextAreasGeoJson,
    nextRanchGeoJson,
    nextRanchKml,
    nextZonesGeoJson,
    nextZonesKml,
  }: {
    nextAreasGeoJson?: CreateBakkiMapOptions['areasGeoJson'];
    nextRanchGeoJson?: CreateBakkiMapOptions['ranchGeoJson'];
    nextRanchKml?: string;
    nextZonesGeoJson?: CreateBakkiMapOptions['zonesGeoJson'];
    nextZonesKml?: string;
  }) => {
    clearGeometryEdit();
    setHoveredFeatureState(null, null);
    const nextRanchFeatures = readFeatures({
      geoJson: nextRanchGeoJson,
      geoJsonFormat,
      kml: nextRanchKml,
      kmlFormat,
    });
    const nextZoneFeatures = readFeatures({
      geoJson: nextZonesGeoJson,
      geoJsonFormat,
      kml: nextZonesKml,
      kmlFormat,
    });
    const nextAreaFeatures = readFeatures({
      geoJson: nextAreasGeoJson,
      geoJsonFormat,
      kml: undefined,
      kmlFormat,
      optional: true,
    });

    applyFeatureMetadata(nextZoneFeatures, nextAreaFeatures);

    ranchSource.clear(true);
    areaSource.clear(true);
    zoneSource.clear(true);
    ranchSource.addFeatures(nextRanchFeatures);
    areaSource.addFeatures(nextAreaFeatures);
    zoneSource.addFeatures(nextZoneFeatures);

    currentExtent = zoneSource.getExtent();
    if (!currentExtent || isExtentEmpty(currentExtent)) {
      currentExtent = areaSource.getExtent();
    }
    if (!currentExtent || isExtentEmpty(currentExtent)) {
      currentExtent = ranchSource.getExtent();
    }

    zoneLayer.changed();
    requestAnimationFrame(() => {
      map.updateSize();
      fitToExtent();
    });
  };

  applyData({
    nextAreasGeoJson: areasGeoJson,
    nextRanchGeoJson: ranchGeoJson,
    nextRanchKml: ranchKml,
    nextZonesGeoJson: zonesGeoJson,
    nextZonesKml: zonesKml,
  });

  drawInteraction.on('drawstart', (event) => {
    geometryEditSource.clear(true);
    modifyInteraction.setActive(false);
    clearSketchFeature();
    activeSketchFeature = event.feature as Feature<Geometry>;
    activeSketchFeature.set('zoneId', editingGeometryId);
    activeSketchFeature.set('zoneName', editingZoneName);
    activeSketchGeometryKey = activeSketchFeature.getGeometry()?.on('change', () => {
      emitGeometryDraftChange();
      geometryEditLayer.changed();
    }) ?? null;
    setGeometryInteractionState(true);
    setGeometryDrawingState(true);
    onGeometryDraftChange?.(null);
  });

  drawInteraction.on('drawend', (event) => {
    if (editingGeometryKind !== 'new-area' || !editingGeometryId) {
      return;
    }

    clearSketchFeature();
    const editFeature = event.feature as Feature<Geometry>;
    editFeature.set('zoneId', editingGeometryId);
    editFeature.set('zoneName', editingZoneName);
    if (!editFeature.getGeometry() || !isGeometryInsideActiveZone(editFeature.getGeometry()!)) {
      geometryEditSource.clear(true);
      editingGeometryLastValidJson = null;
      setGeometryDrawingState(false);
      modifyInteraction.setActive(false);
      onGeometryDraftChange?.(null);
      geometryEditLayer.changed();
      return;
    }

    attachEditableFeature(editFeature);
    editingGeometryLastValidJson = JSON.stringify(writeGeometry(geoJsonFormat, editFeature.getGeometry()!));
    editingGeometryOriginalJson = editingGeometryLastValidJson;
    modifyInteraction.setActive(true);
    setGeometryInteractionState(true);
    setGeometryDrawingState(false);
    emitGeometryDraftChangeForFeature(editFeature);
    geometryEditLayer.changed();
  });

  map.on('pointermove', (event) => {
    if (editingGeometryKind) {
      setHoveredFeatureState(null, null);
    } else {
      const features = map.getFeaturesAtPixel(event.pixel) as Feature<Geometry>[] | undefined;
      const areaFeature = features?.find((feature) => Boolean(feature.get('areaId')));
      const zoneFeature = features?.find((feature) => Boolean(feature.get('zoneId')));
      const nextAreaId = (areaFeature?.get('areaId') as string | undefined) ?? null;
      const nextZoneId =
        (areaFeature?.get('zoneId') as string | undefined)
        ?? (zoneFeature?.get('zoneId') as string | undefined)
        ?? null;
      setHoveredFeatureState(nextZoneId, nextAreaId);
    }

    if (!onPointerCoordinate) {
      return;
    }

    const [lng, lat] = transform(event.coordinate, 'EPSG:3857', 'EPSG:4326');
    onPointerCoordinate(lat, lng);
  });

  map.on('singleclick', (event) => {
    if (editingGeometryKind) {
      return;
    }

    const emitSelection = (selection: BakkiMapSelection | null) => {
      selectedZoneId = selection?.zoneId ?? null;
      selectedAreaId = selection?.kind === 'area' ? selection.areaId : null;
      zoneLayer.changed();
      areaLayer.changed();
      onSelectionChange?.(selection);
    };
    const features = map.getFeaturesAtPixel(event.pixel) as Feature<Geometry>[] | undefined;
    if (!features || features.length === 0) {
      emitSelection(null);
      return;
    }

    const zoneFeature = features.find((feature) => Boolean(feature.get('zoneId')));
    const areaFeature = features.find((feature) => Boolean(feature.get('areaId')));

    if (selectionMode === 'zone') {
      const zoneSelection = resolveZoneSelection(zoneFeature);
      if (zoneSelection) {
        emitSelection(zoneSelection);
        return;
      }
    }

    if (selectionMode === 'area') {
      const areaSelection = resolveAreaSelection(areaFeature);
      if (areaSelection) {
        emitSelection(areaSelection);
        return;
      }
    }

    const areaSelection = resolveAreaSelection(areaFeature);
    if (areaSelection) {
      emitSelection(areaSelection);
      return;
    }

    const zoneSelection = resolveZoneSelection(zoneFeature);
    if (zoneSelection) {
      emitSelection(zoneSelection);
      return;
    }

    emitSelection(null);
  });

  return {
    destroy() {
      resizeObserver?.disconnect();
      target.removeEventListener('pointerleave', handlePointerLeave);
      target.style.cursor = '';
      clearGeometryEdit();
      setHoveredFeatureState(null, null);
      map.setTarget(undefined);
    },
    zoomIn() {
      map.getView().animate({ zoom: (map.getView().getZoom() ?? 12) + 1, duration: 120 });
    },
    zoomOut() {
      map.getView().animate({ zoom: (map.getView().getZoom() ?? 12) - 1, duration: 120 });
    },
    reset() {
      fitToExtent();
    },
    setData(input) {
      applyData({
        nextAreasGeoJson: input.areasGeoJson,
        nextRanchGeoJson: input.ranchGeoJson,
        nextRanchKml: input.ranchKml,
        nextZonesGeoJson: input.zonesGeoJson,
        nextZonesKml: input.zonesKml,
      });
    },
    setLayerVisibility(layer, visible) {
      if (layer === 'ranch') {
        ranchLayer.setVisible(visible);
      }

      if (layer === 'areas') {
        areaLayer.setVisible(visible);
      }

      if (layer === 'zones') {
        zoneLayer.setVisible(visible);
      }
    },
    setSelectionMode(mode) {
      selectionMode = mode;
    },
    setSelectedSelection(selection) {
      if (editingGeometryKind === 'area' && selection?.kind !== 'area') {
        clearGeometryEdit();
      }

      if (editingGeometryKind === 'area' && selection?.areaId !== editingGeometryId) {
        clearGeometryEdit();
      }

      if (editingGeometryKind === 'zone' && selection?.kind !== 'zone') {
        clearGeometryEdit();
      }

      if (editingGeometryKind === 'zone' && selection?.zoneId !== editingGeometryId) {
        clearGeometryEdit();
      }

      if (editingGeometryKind === 'new-area' && selection?.zoneId !== editingGeometryId) {
        clearGeometryEdit();
      }

      selectedZoneId = selection?.zoneId ?? null;
      selectedAreaId = selection?.kind === 'area' ? selection.areaId : null;
      zoneLayer.changed();
      areaLayer.changed();
    },
    setHoveredSelection(selection) {
      setExternalHoveredFeatureState(
        selection?.zoneId ?? null,
        selection?.kind === 'area' ? selection.areaId : null,
      );
    },
    beginAreaGeometryEdit(areaId) {
      return beginGeometryEdit('area', areaId);
    },
    beginAreaCreation(zoneId, zoneName) {
      return beginAreaCreation(zoneId, zoneName);
    },
    beginZoneGeometryEdit(zoneId) {
      return beginGeometryEdit('zone', zoneId);
    },
    finishGeometryDraw() {
      if (editingGeometryKind !== 'new-area' || !drawInteraction.getActive()) {
        return false;
      }

      return Boolean(drawInteraction.finishDrawing());
    },
    cancelGeometryEdit() {
      clearGeometryEdit();
    },
    resetGeometryEdit() {
      if (editingGeometryKind === 'new-area') {
        drawInteraction.abortDrawing();
        clearSketchFeature();
        geometryEditSource.clear(true);
        editingGeometryOriginalJson = null;
        editingGeometryLastValidJson = null;
        modifyInteraction.setActive(false);
        drawInteraction.setActive(true);
        setGeometryInteractionState(true);
        setGeometryDrawingState(false);
        onGeometryDraftChange?.(null);
        geometryEditLayer.changed();
        return;
      }

      const editFeature = geometryEditSource.getFeatures()[0];
      if (!editFeature || !editingGeometryOriginalJson) {
        return;
      }

      editFeature.setGeometry(readGeometry(geoJsonFormat, JSON.parse(editingGeometryOriginalJson)));
      emitGeometryDraftChange();
      geometryEditLayer.changed();
    },
  };
}
