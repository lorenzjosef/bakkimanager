import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { LocalTile, Polygon, Marker, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import { useOfflineStore, type CachedArea, type CachedZone } from '@bakki/mobile-offline';
import { useOfflineSync } from '../hooks';
import { ensureOfflineTileCache, getLocalTilePathTemplate } from '../map/tileCache';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Colors for zones (cycle through these)
const ZONE_COLORS = [
  '#2e7d32', // Green
  '#1565c0', // Blue
  '#6a1b9a', // Purple
  '#e65100', // Orange
  '#00838f', // Teal
];

function getZoneColor(index: number): string {
  return ZONE_COLORS[index % ZONE_COLORS.length];
}

function coordsToLatLng(coordinates: number[][]): Array<{ latitude: number; longitude: number }> {
  return coordinates.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
}

function getFirstRingCoordinates(
  geometry: unknown,
): number[][] | null {
  if (!geometry || typeof geometry !== 'object') {
    return null;
  }

  const candidate = geometry as { type?: string; coordinates?: unknown };
  if (candidate.type === 'Polygon' && Array.isArray(candidate.coordinates)) {
    const ring = candidate.coordinates[0];
    return Array.isArray(ring) ? (ring as number[][]) : null;
  }
  if (candidate.type === 'MultiPolygon' && Array.isArray(candidate.coordinates)) {
    const polygon = candidate.coordinates[0];
    const ring = Array.isArray(polygon) ? polygon[0] : null;
    return Array.isArray(ring) ? (ring as number[][]) : null;
  }
  return null;
}

interface AreaDetailModalProps {
  area: CachedArea | null;
  onClose: () => void;
}

function AreaDetailModal({ area, onClose }: AreaDetailModalProps) {
  if (!area) return null;

  return (
    <Modal visible={!!area} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{area.name}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>📍 Zone</Text>
              <Text style={styles.infoValue}>{area.zoneName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>📐 Size</Text>
              <Text style={styles.infoValue}>{area.hectaresTotal.toFixed(2)} ha</Text>
            </View>
            {area.density !== null && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>🌱 Density</Text>
                <Text style={styles.infoValue}>{area.density} trees/ha</Text>
              </View>
            )}
            {area.treeCount !== null && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>🌲 Trees</Text>
                <Text style={styles.infoValue}>{area.treeCount.toLocaleString()}</Text>
              </View>
            )}
            {area.speciesName && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>🌿 Species</Text>
                <Text style={styles.infoValue}>{area.speciesName}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [selectedArea, setSelectedArea] = useState<CachedArea | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [localTilePath, setLocalTilePath] = useState<string | null>(getLocalTilePathTemplate());

  const { syncData, isOnline, isSyncing, syncStatus, lastSyncAt } = useOfflineSync();
  const ranch = useOfflineStore((s) => s.ranch);
  const zonesById = useOfflineStore((s) => s.zones);
  const areasById = useOfflineStore((s) => s.areas);
  const zones = useMemo(() => Object.values(zonesById), [zonesById]);
  const areas = useMemo(() => Object.values(areasById), [areasById]);

  // Create a zone index for coloring
  const zoneColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    zones.forEach((zone, i) => {
      map[zone.id] = getZoneColor(i);
    });
    return map;
  }, [zones]);

  // Calculate initial region from ranch bounding box
  const initialRegion: Region = useMemo(() => {
    if (ranch?.boundingBox) {
      const { minLat, maxLat, minLng, maxLng } = ranch.boundingBox;
      return {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: (maxLat - minLat) * 1.2,
        longitudeDelta: (maxLng - minLng) * 1.2,
      };
    }
    // Default to Costa Rica (typical forestry location)
    return {
      latitude: 9.9281,
      longitude: -84.0907,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };
  }, [ranch]);

  useEffect(() => {
    if (!ranch?.boundingBox) {
      return;
    }

    let cancelled = false;
    void ensureOfflineTileCache(ranch.boundingBox).then((result) => {
      if (cancelled) {
        return;
      }
      setLocalTilePath((currentPath) => (
        currentPath === result.pathTemplate ? currentPath : result.pathTemplate
      ));
    });

    return () => {
      cancelled = true;
    };
  }, [
    ranch?.boundingBox?.minLat,
    ranch?.boundingBox?.maxLat,
    ranch?.boundingBox?.minLng,
    ranch?.boundingBox?.maxLng,
  ]);

  const handleAreaPress = useCallback((area: CachedArea) => {
    setSelectedArea(area);
  }, []);

  const handleRefresh = useCallback(() => {
    syncData();
  }, [syncData]);

  const handleFitToRanch = useCallback(() => {
    if (ranch?.boundingBox && mapRef.current) {
      const { minLat, maxLat, minLng, maxLng } = ranch.boundingBox;
      mapRef.current.fitToCoordinates(
        [
          { latitude: minLat, longitude: minLng },
          { latitude: maxLat, longitude: maxLng },
        ],
        {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        }
      );
    }
  }, [ranch]);

  const isInitialLoad = syncStatus === 'stale' && !lastSyncAt;
  const hasData = zones.length > 0 || areas.length > 0;

  if (isInitialLoad && isSyncing) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2e7d32" />
          <Text style={styles.loadingText}>Loading map data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!hasData && !isSyncing) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🗺️</Text>
          <Text style={styles.emptyTitle}>No Map Data</Text>
          <Text style={styles.emptySubtitle}>
            Map data will appear here after syncing with the server.
          </Text>
          <TouchableOpacity style={styles.syncButton} onPress={handleRefresh}>
            <Text style={styles.syncButtonText}>Sync Now</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={initialRegion}
        onMapReady={() => setMapReady(true)}
        showsUserLocation
        showsMyLocationButton={false}
        mapType="terrain"
      >
        {localTilePath && (
          <LocalTile
            pathTemplate={localTilePath}
            tileSize={256}
            zIndex={-1}
          />
        )}

        {/* Render ranch boundary */}
        {ranch?.geometry && mapReady && (
          (() => {
            const ring = getFirstRingCoordinates(ranch.geometry);
            if (!ring) return null;
            return (
              <Polygon
                coordinates={coordsToLatLng(ring)}
                strokeColor="#1a3518"
                strokeWidth={3}
                fillColor="rgba(26, 53, 24, 0.05)"
              />
            );
          })()
        )}

        {/* Render zones */}
        {zones.map((zone, index) => {
          const ring = getFirstRingCoordinates(zone.geometry);
          if (!ring) return null;

          return (
            <Polygon
              key={zone.id}
              coordinates={coordsToLatLng(ring)}
              strokeColor={getZoneColor(index)}
              strokeWidth={2}
              fillColor={`${getZoneColor(index)}20`}
            />
          );
        })}

        {/* Render areas */}
        {areas.map((area) => {
          const ring = getFirstRingCoordinates(area.geometry);
          if (!ring) return null;

          const zoneColor = zoneColorMap[area.zoneId] || '#2e7d32';

          return (
            <Polygon
              key={area.id}
              coordinates={coordsToLatLng(ring)}
              strokeColor={zoneColor}
              strokeWidth={2}
              fillColor={`${zoneColor}40`}
              tappable
              onPress={() => handleAreaPress(area)}
            />
          );
        })}

        {/* Area center markers */}
        {areas.map((area) => {
          const ring = getFirstRingCoordinates(area.geometry);
          if (!ring) return null;

          // Calculate center of polygon
          const centerLat = ring.reduce((sum, c) => sum + c[1], 0) / ring.length;
          const centerLng = ring.reduce((sum, c) => sum + c[0], 0) / ring.length;

          return (
            <Marker
              key={`marker-${area.id}`}
              coordinate={{ latitude: centerLat, longitude: centerLng }}
              onPress={() => handleAreaPress(area)}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.areaMarker}>
                <Text style={styles.areaMarkerText}>{area.name.slice(0, 2)}</Text>
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Map Controls */}
      <View style={styles.mapControls}>
        <TouchableOpacity style={styles.controlButton} onPress={handleFitToRanch}>
          <Text style={styles.controlButtonText}>🏠</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.controlButton, isSyncing && styles.controlButtonDisabled]}
          onPress={handleRefresh}
          disabled={isSyncing}
        >
          <Text style={styles.controlButtonText}>{isSyncing ? '⏳' : '🔄'}</Text>
        </TouchableOpacity>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Zones</Text>
        {zones.slice(0, 5).map((zone, index) => (
          <View key={zone.id} style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: getZoneColor(index) }]} />
            <Text style={styles.legendText} numberOfLines={1}>
              {zone.name}
            </Text>
          </View>
        ))}
        {zones.length > 5 && (
          <Text style={styles.legendMore}>+{zones.length - 5} more</Text>
        )}
      </View>

      {/* Offline indicator */}
      {(!isOnline || syncStatus === 'error') && (
        <View style={styles.offlineIndicator}>
          <Text style={styles.offlineText}>📴 Using cached map data</Text>
        </View>
      )}

      {/* Area Detail Modal */}
      <AreaDetailModal area={selectedArea} onClose={() => setSelectedArea(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f8f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#4a6747',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a3518',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#4a6747',
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: 16,
  },
  syncButton: {
    backgroundColor: '#2e7d32',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  map: {
    flex: 1,
  },
  mapControls: {
    position: 'absolute',
    right: 16,
    top: 16,
    gap: 8,
  },
  controlButton: {
    width: 44,
    height: 44,
    backgroundColor: '#fff',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  controlButtonDisabled: {
    opacity: 0.5,
  },
  controlButtonText: {
    fontSize: 20,
  },
  legend: {
    position: 'absolute',
    left: 16,
    bottom: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    minWidth: 120,
    maxWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 12,
    color: '#374151',
    flex: 1,
  },
  legendMore: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
  },
  offlineIndicator: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  offlineText: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '500',
  },
  areaMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2e7d32',
  },
  areaMarkerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2e7d32',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#6b7280',
  },
  modalBody: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
});
