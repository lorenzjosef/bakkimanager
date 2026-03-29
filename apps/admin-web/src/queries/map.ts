import {
  type AreaGeometryProperties,
  type CreateAreaRequest,
  type CreateAreaResponse,
  type DeleteAreaResponse,
  type GeoJsonFeatureCollection,
  type MapViewerData,
  type UpdateAreaDetailsRequest,
  type UpdateAreaDetailsResponse,
  type UpdateAreaGeometryRequest,
  type UpdateAreaGeometryResponse,
  type RanchGeometryProperties,
  type UpdateAreaMetricsRequest,
  type UpdateAreaMetricsResponse,
  type MapManagementFixture,
  type ZoneGeometryProperties,
  type UpdateZoneGeometryRequest,
  type UpdateZoneGeometryResponse,
} from '@bakki/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchApiJson, requestApiJson } from '@/lib/api';
import {
  DASHBOARD_SUMMARY_QUERY_KEY,
  MAP_AREA_GEOMETRY_QUERY_KEY,
  MAP_MANAGEMENT_DATA_QUERY_KEY,
  MAP_RANCH_GEOMETRY_QUERY_KEY,
  MAP_VIEWER_DATA_QUERY_KEY,
  MAP_ZONE_GEOMETRY_QUERY_KEY,
} from '@/queries/query-keys';
import {
  CREATE_AREA_INVALIDATION_QUERY_KEYS,
  DELETE_AREA_INVALIDATION_QUERY_KEYS,
  UPDATE_AREA_DETAILS_INVALIDATION_QUERY_KEYS,
  UPDATE_AREA_GEOMETRY_INVALIDATION_QUERY_KEYS,
  UPDATE_AREA_METRICS_INVALIDATION_QUERY_KEYS,
  UPDATE_ZONE_GEOMETRY_INVALIDATION_QUERY_KEYS,
} from '@/queries/mutation-invalidation-utils';
import { invalidateQueryKeys } from '@/queries/query-invalidation';

export function useMapViewerData() {
  return useQuery({
    queryKey: MAP_VIEWER_DATA_QUERY_KEY,
    queryFn: () => fetchApiJson<MapViewerData>('/map/viewer'),
    retry: false,
  });
}

export function useMapManagementData() {
  return useQuery({
    queryKey: MAP_MANAGEMENT_DATA_QUERY_KEY,
    queryFn: () => fetchApiJson<MapManagementFixture>('/map/management'),
    retry: false,
  });
}

export function useRanchGeometryData() {
  return useQuery({
    queryKey: MAP_RANCH_GEOMETRY_QUERY_KEY,
    queryFn: () => fetchApiJson<GeoJsonFeatureCollection<RanchGeometryProperties>>('/map/ranch/geometry'),
    retry: false,
  });
}

export function useZoneGeometryData() {
  return useQuery({
    queryKey: MAP_ZONE_GEOMETRY_QUERY_KEY,
    queryFn: () => fetchApiJson<GeoJsonFeatureCollection<ZoneGeometryProperties>>('/map/zones/geometry'),
    retry: false,
  });
}

export function useAreaGeometryData() {
  return useQuery({
    queryKey: MAP_AREA_GEOMETRY_QUERY_KEY,
    queryFn: () => fetchApiJson<GeoJsonFeatureCollection<AreaGeometryProperties>>('/map/areas/geometry'),
    retry: false,
  });
}

export function useUpdateAreaMetricsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      areaId,
      payload,
    }: {
      areaId: string;
      payload: UpdateAreaMetricsRequest;
    }) =>
      requestApiJson<UpdateAreaMetricsResponse>(`/map/areas/${areaId}/metrics`, {
        method: 'PATCH',
        body: payload,
      }),
    onSuccess: async () => {
      await invalidateQueryKeys(queryClient, UPDATE_AREA_METRICS_INVALIDATION_QUERY_KEYS);
    },
  });
}

export function useCreateAreaMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAreaRequest) =>
      requestApiJson<CreateAreaResponse>('/map/areas', {
        method: 'POST',
        body: payload,
      }),
    onSuccess: async () => {
      await invalidateQueryKeys(queryClient, CREATE_AREA_INVALIDATION_QUERY_KEYS);
    },
  });
}

export function useUpdateAreaDetailsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      areaId,
      payload,
    }: {
      areaId: string;
      payload: UpdateAreaDetailsRequest;
    }) =>
      requestApiJson<UpdateAreaDetailsResponse>(`/map/areas/${areaId}/details`, {
        method: 'PATCH',
        body: payload,
      }),
    onSuccess: async () => {
      await invalidateQueryKeys(queryClient, UPDATE_AREA_DETAILS_INVALIDATION_QUERY_KEYS);
    },
  });
}

export function useUpdateAreaGeometryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      areaId,
      payload,
    }: {
      areaId: string;
      payload: UpdateAreaGeometryRequest;
    }) =>
      requestApiJson<UpdateAreaGeometryResponse>(`/map/areas/${areaId}/geometry`, {
        method: 'PATCH',
        body: payload,
      }),
    onSuccess: async () => {
      await invalidateQueryKeys(queryClient, UPDATE_AREA_GEOMETRY_INVALIDATION_QUERY_KEYS);
    },
  });
}

export function useDeleteAreaMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (areaId: string) =>
      requestApiJson<DeleteAreaResponse>(`/map/areas/${areaId}`, {
        method: 'DELETE',
      }),
    onSuccess: async () => {
      await invalidateQueryKeys(queryClient, DELETE_AREA_INVALIDATION_QUERY_KEYS);
    },
  });
}

export function useUpdateZoneGeometryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      payload,
      zoneId,
    }: {
      payload: UpdateZoneGeometryRequest;
      zoneId: string;
    }) =>
      requestApiJson<UpdateZoneGeometryResponse>(`/map/zones/${zoneId}/geometry`, {
        method: 'PATCH',
        body: payload,
      }),
    onSuccess: async () => {
      await invalidateQueryKeys(queryClient, UPDATE_ZONE_GEOMETRY_INVALIDATION_QUERY_KEYS);
    },
  });
}
