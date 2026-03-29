import { useEffect, useMemo, useRef, useState } from 'react';
import type { BakkiMapHandle, BakkiMapSelection } from '@bakki/map';
import type {
  AreaGeometryProperties,
  GeoJsonFeatureCollection,
  RanchGeometryProperties,
  ZoneGeometryProperties,
} from '@bakki/domain';
import ranchKml from '@/prototype/ranch-coordinates.kml?raw';
import zonesKml from '@/prototype/zones.kml?raw';
import { useAreaGeometryData, useRanchGeometryData, useZoneGeometryData } from '@/queries/map';

interface PlantingWizardAreaMapProps {
  activeAreaId: string | null;
  onSelectArea: (areaId: string) => void;
}

let mapModulePromise: Promise<typeof import('@bakki/map')> | null = null;

function loadMapModule() {
  if (!mapModulePromise) {
    mapModulePromise = import('@bakki/map');
  }

  return mapModulePromise;
}

function formatHemisphere(value: number, positive: string, negative: string) {
  return `${Math.abs(value).toFixed(4)}° ${value >= 0 ? positive : negative}`;
}

function formatLatLng(lat: number, lng: number) {
  return `${formatHemisphere(lat, 'N', 'S')}, ${formatHemisphere(lng, 'E', 'W')}`;
}

function buildAreaSelectionById(
  areaGeometry: GeoJsonFeatureCollection<AreaGeometryProperties> | null | undefined,
  zoneGeometry: GeoJsonFeatureCollection<ZoneGeometryProperties> | null | undefined,
) {
  const zoneNameById = new Map(
    (zoneGeometry?.features ?? []).map((feature) => [feature.properties.id, feature.properties.name] as const),
  );

  return new Map(
    (areaGeometry?.features ?? []).map((feature) => {
      const zoneId = feature.properties.zoneRef;
      return [
        feature.properties.areaRef,
        {
          kind: 'area',
          areaId: feature.properties.areaRef,
          areaName: feature.properties.name,
          zoneId,
          zoneName: zoneNameById.get(zoneId) ?? zoneId,
        } satisfies BakkiMapSelection,
      ] as const;
    }),
  );
}

export function PlantingWizardAreaMap({
  activeAreaId,
  onSelectArea,
}: PlantingWizardAreaMapProps) {
  const targetRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<BakkiMapHandle | null>(null);
  const onSelectAreaRef = useRef(onSelectArea);
  const ranchGeometryQuery = useRanchGeometryData();
  const zoneGeometryQuery = useZoneGeometryData();
  const areaGeometryQuery = useAreaGeometryData();
  const [isRuntimeReady, setIsRuntimeReady] = useState(false);
  const [coordinateLabel, setCoordinateLabel] = useState('Move over the map');
  const areaSelectionById = useMemo(
    () => buildAreaSelectionById(areaGeometryQuery.data, zoneGeometryQuery.data),
    [areaGeometryQuery.data, zoneGeometryQuery.data],
  );

  useEffect(() => {
    onSelectAreaRef.current = onSelectArea;
  }, [onSelectArea]);

  useEffect(() => {
    const target = targetRef.current;
    if (!target || handleRef.current) {
      return;
    }

    let cancelled = false;
    setIsRuntimeReady(false);

    void loadMapModule().then(({ createBakkiMap }) => {
      if (cancelled || !target || handleRef.current) {
        return;
      }

      const handle = createBakkiMap({
        target,
        mode: 'viewer',
        areasGeoJson: areaGeometryQuery.data ?? null,
        ranchGeoJson: ranchGeometryQuery.data ?? null,
        ranchKml,
        zonesGeoJson: zoneGeometryQuery.data ?? null,
        zonesKml,
        onPointerCoordinate(lat, lng) {
          setCoordinateLabel(formatLatLng(lat, lng));
        },
        onSelectionChange(selection) {
          if (selection?.areaId) {
            onSelectAreaRef.current(selection.areaId);
          }
        },
      });

      handle.setSelectionMode('area');
      handle.setLayerVisibility('ranch', true);
      handle.setLayerVisibility('zones', true);
      handle.setLayerVisibility('areas', true);
      handleRef.current = handle;
      setIsRuntimeReady(true);
    });

    return () => {
      cancelled = true;
      handleRef.current?.destroy();
      handleRef.current = null;
      setIsRuntimeReady(false);
    };
  }, [
    areaGeometryQuery.data,
    ranchGeometryQuery.data,
    zoneGeometryQuery.data,
  ]);

  useEffect(() => {
    handleRef.current?.setData({
      areasGeoJson: areaGeometryQuery.data ?? null,
      ranchGeoJson: ranchGeometryQuery.data ?? null,
      ranchKml,
      zonesGeoJson: zoneGeometryQuery.data ?? null,
      zonesKml,
    });
  }, [areaGeometryQuery.data, ranchGeometryQuery.data, zoneGeometryQuery.data]);

  useEffect(() => {
    handleRef.current?.setSelectedSelection(
      activeAreaId ? (areaSelectionById.get(activeAreaId) ?? null) : null,
    );
  }, [activeAreaId, areaSelectionById]);

  return (
    <>
      <div className="phase-wizard-map-image">
        <div
          aria-label="Interactive planting area map"
          className="map-management-live-map phase-wizard-live-map"
          ref={targetRef}
        />
        {!isRuntimeReady ? (
          <div aria-live="polite" className="map-runtime-loading phase-wizard-map-loading" role="status">
            <div className="map-runtime-loading-card">
              <span className="map-runtime-loading-eyebrow">Interactive Map</span>
              <strong>Preparing area selection</strong>
              <span>Loading live ranch, zone, and area geometry.</span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="phase-wizard-map-tools">
        <div className="phase-wizard-map-tool-stack">
          <button className="phase-wizard-map-tool phase-wizard-map-tool-text" onClick={() => handleRef.current?.zoomIn()} type="button">
            +
          </button>
          <button className="phase-wizard-map-tool phase-wizard-map-tool-text" onClick={() => handleRef.current?.zoomOut()} type="button">
            -
          </button>
        </div>
        <button
          className="phase-wizard-map-tool phase-wizard-map-tool-secondary phase-wizard-map-tool-reset"
          onClick={() => handleRef.current?.reset()}
          type="button"
        >
          Reset
        </button>
      </div>

      <div className="phase-wizard-map-coordinates">
        <span>Selection Center:</span>
        <strong>{coordinateLabel}</strong>
      </div>
    </>
  );
}
