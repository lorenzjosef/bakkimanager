import { Geometry } from 'ol/geom';
import type Feature from 'ol/Feature';
import { slugify } from './map-geometry';

export function applyFeatureMetadata(
  zoneFeatures: Feature<Geometry>[],
  areaFeatures: Feature<Geometry>[],
) {
  zoneFeatures.forEach((feature, index) => {
    const propertiesId = feature.get('id') as string | undefined;
    const name = String(feature.get('name') ?? `Zone ${index + 1}`);
    feature.set('zoneId', propertiesId ?? slugify(name));
    feature.set('zoneName', name);
  });

  const zoneNameById = new Map<string, string>(
    zoneFeatures.map((feature) => [
      String(feature.get('zoneId') ?? ''),
      String(feature.get('zoneName') ?? ''),
    ]),
  );

  areaFeatures.forEach((feature, index) => {
    const areaName = String(feature.get('name') ?? `Area ${index + 1}`);
    const areaId = String(feature.get('areaRef') ?? feature.get('id') ?? slugify(areaName));
    const zoneId = String(feature.get('zoneRef') ?? '');
    feature.set('areaId', areaId);
    feature.set('areaName', areaName);
    feature.set('zoneId', zoneId || null);
    feature.set('zoneName', zoneNameById.get(zoneId) ?? zoneId);
  });
}
