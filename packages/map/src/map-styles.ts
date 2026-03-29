import { Fill, Stroke, Style, Text } from 'ol/style';
import { Geometry } from 'ol/geom';
import type Feature from 'ol/Feature';

export function createRanchStyle() {
  return new Style({
    stroke: new Stroke({
      color: '#0d3a29',
      width: 2.4,
      lineDash: [10, 8],
    }),
    fill: new Fill({ color: 'rgba(255,255,255,0)' }),
  });
}

export function createZoneStyle(
  feature: Feature<Geometry>,
  selectedZoneId: string | null,
  mode: 'viewer' | 'management',
  editingZoneId: string | null,
  hoveredZoneId: string | null,
) {
  const zoneId = feature.get('zoneId') as string;
  const zoneName = feature.get('zoneName') as string;
  const isSelected = zoneId === selectedZoneId;
  const isEditing = zoneId === editingZoneId;
  const isHovered = zoneId === hoveredZoneId;

  return new Style({
    stroke: new Stroke({
      color: isEditing
        ? 'rgba(0,0,0,0)'
        : isSelected
          ? '#154212'
          : isHovered
            ? mode === 'management'
              ? '#315c79'
              : '#264a34'
            : mode === 'management'
              ? '#4b6c8e'
              : '#31553f',
      width: isSelected ? 4 : isHovered ? 3.4 : mode === 'management' ? 2.8 : 3,
      lineDash: mode === 'management' && !isSelected && !isHovered ? [14, 8] : undefined,
    }),
    fill: new Fill({
      color: isEditing
        ? 'rgba(0,0,0,0)'
        : isSelected
          ? mode === 'management'
            ? 'rgba(188, 240, 174, 0.16)'
            : 'rgba(216, 241, 207, 0.12)'
          : isHovered
            ? mode === 'management'
              ? 'rgba(122, 167, 208, 0.10)'
              : 'rgba(208, 231, 196, 0.10)'
            : 'rgba(255,255,255,0.03)',
    }),
    text: new Text({
      text: zoneName,
      font: '700 15px Manrope',
      fill: new Fill({ color: '#31463a' }),
      backgroundFill: new Fill({ color: 'rgba(255,255,255,0.84)' }),
      padding: [6, 10, 6, 10],
      overflow: true,
    }),
  });
}

export function createAreaStyle(
  feature: Feature<Geometry>,
  selectedAreaId: string | null,
  mode: 'viewer' | 'management',
  editingAreaId: string | null,
  hoveredAreaId: string | null,
) {
  const areaId = feature.get('areaId') as string | undefined;
  const isSelected = areaId === selectedAreaId;
  const isEditing = areaId === editingAreaId;
  const isHovered = areaId === hoveredAreaId;

  return new Style({
    stroke: new Stroke({
      color: isEditing
        ? 'rgba(0,0,0,0)'
        : isSelected
          ? mode === 'management'
            ? '#2f5a26'
            : '#40652f'
          : isHovered
            ? mode === 'management'
              ? '#567439'
              : '#54743c'
            : mode === 'management'
              ? 'rgba(122, 157, 86, 0.95)'
              : 'rgba(118, 143, 84, 0.9)',
      width: isSelected ? 3 : isHovered ? 2.2 : mode === 'management' ? 1.8 : 1.4,
      lineDash: isSelected || isHovered ? undefined : mode === 'management' ? [8, 6] : [5, 5],
    }),
    fill: new Fill({
      color: isEditing
        ? 'rgba(0,0,0,0)'
        : isSelected
          ? mode === 'management'
            ? 'rgba(191, 226, 170, 0.24)'
            : 'rgba(210, 231, 189, 0.18)'
          : isHovered
            ? mode === 'management'
              ? 'rgba(201, 230, 171, 0.16)'
              : 'rgba(216, 236, 197, 0.14)'
            : mode === 'management'
              ? 'rgba(191, 226, 170, 0.08)'
              : 'rgba(210, 231, 189, 0.05)',
    }),
  });
}

export function createAreaEditStyle() {
  return new Style({
    stroke: new Stroke({
      color: '#154212',
      width: 3.2,
    }),
    fill: new Fill({
      color: 'rgba(188, 240, 174, 0.22)',
    }),
  });
}
