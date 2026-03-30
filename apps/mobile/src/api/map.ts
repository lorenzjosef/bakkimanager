/**
 * Map/Geometry API for mobile client.
 */

import { apiRequest } from './client';
import type { CachedRanch, CachedZone, CachedArea } from '@bakki/mobile-offline';
import type { GeoJsonFeatureCollection } from '@bakki/domain';

export interface RanchResponse {
  ranch: CachedRanch;
}

export interface ZonesResponse {
  zones: CachedZone[];
}

export interface AreasResponse {
  areas: CachedArea[];
}

export interface MapGeometryResponse {
  ranch: GeoJsonFeatureCollection<{ id: string; name: string }>;
  zones: GeoJsonFeatureCollection<{
    id: string;
    name: string;
    hectaresEstimate: number;
    status: string;
  }>;
  areas: GeoJsonFeatureCollection<{
    id: string;
    name: string;
    zoneId: string;
    zoneName: string;
    hectaresTotal: number;
  }>;
}

export const mapApi = {
  /**
   * Get ranch boundary data.
   */
  async getRanch(): Promise<RanchResponse> {
    const response = await apiRequest<RanchResponse>('/map/ranch');
    return response.data;
  },

  /**
   * Get all zones.
   */
  async getZones(): Promise<ZonesResponse> {
    const response = await apiRequest<{ zones: CachedZone[] }>('/map/zones');
    return { zones: response.data.zones || [] };
  },

  /**
   * Get all areas with geometry.
   */
  async getAreas(): Promise<AreasResponse> {
    const response = await apiRequest<{ areas: CachedArea[] }>('/map/areas/geometry');
    return { areas: response.data.areas || [] };
  },

  /**
   * Get combined geometry data for offline caching.
   */
  async getGeometry(): Promise<MapGeometryResponse> {
    const [ranchRes, zonesRes, areasRes] = await Promise.all([
      apiRequest<GeoJsonFeatureCollection<{ id: string; name: string }>>('/map/ranch/geometry'),
      apiRequest<GeoJsonFeatureCollection<{
        id: string;
        name: string;
        hectaresEstimate: number;
        status: string;
      }>>('/map/zones/geometry'),
      apiRequest<GeoJsonFeatureCollection<{
        id: string;
        name: string;
        zoneId: string;
        zoneName: string;
        hectaresTotal: number;
      }>>('/map/areas/geometry'),
    ]);

    return {
      ranch: ranchRes.data,
      zones: zonesRes.data,
      areas: areasRes.data,
    };
  },
};
