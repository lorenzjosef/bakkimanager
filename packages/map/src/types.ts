export interface BakkiMapDataInput {
  areasGeoJson?: SimpleFeatureCollection | null;
  ranchGeoJson?: SimpleFeatureCollection | null;
  ranchKml?: string;
  zonesGeoJson?: SimpleFeatureCollection | null;
  zonesKml?: string;
}

export interface BakkiMapHandle {
  destroy: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  setData: (input: BakkiMapDataInput) => void;
  setLayerVisibility: (layer: 'areas' | 'ranch' | 'zones', visible: boolean) => void;
  setSelectionMode: (mode: 'area' | 'zone') => void;
  setSelectedSelection: (selection: BakkiMapSelection | null) => void;
  setHoveredSelection: (selection: BakkiMapSelection | null) => void;
  beginAreaGeometryEdit: (areaId: string) => boolean;
  beginAreaCreation: (zoneId: string, zoneName?: string | null) => boolean;
  beginZoneGeometryEdit: (zoneId: string) => boolean;
  finishGeometryDraw: () => boolean;
  cancelGeometryEdit: () => void;
  resetGeometryEdit: () => void;
}

export interface BakkiMapSelection {
  kind: 'area' | 'zone';
  zoneId: string;
  zoneName: string;
  areaId: string | null;
  areaName: string | null;
}

export interface BakkiMapGeometryDraft {
  boundaryCoordinates: string[];
  geometry: {
    type: string;
    coordinates: unknown;
  };
  kind: 'area' | 'zone' | 'new-area';
  isDirty: boolean;
  areaId: string | null;
  areaName: string | null;
  zoneId: string | null;
  zoneName: string | null;
}

export interface CreateBakkiMapOptions extends BakkiMapDataInput {
  target: HTMLElement;
  mode: 'viewer' | 'management';
  onPointerCoordinate?: (lat: number, lng: number) => void;
  onSelectionChange?: (selection: BakkiMapSelection | null) => void;
  onGeometryDraftChange?: (draft: BakkiMapGeometryDraft | null) => void;
  onGeometryDrawingChange?: (isDrawing: boolean) => void;
  onGeometryInteractionChange?: (isActive: boolean) => void;
}

export interface SimpleFeatureCollection {
  type: 'FeatureCollection';
  features: Array<{
    geometry: {
      coordinates: unknown;
      type: string;
    };
    id?: string | number;
    properties?: unknown;
    type: 'Feature';
  }>;
}
