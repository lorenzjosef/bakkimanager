import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Polygon, Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  useOfflineStore,
  type CapturedPoint,
  type CaptureMethod,
  calculatePolygonArea,
  validateCapturedPoints,
} from '@bakki/mobile-offline';
import type { AreasStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AreasStackParamList, 'CaptureBoundary'>;

const MIN_POINTS_BOUNDARY_WALK = 10;
const MIN_POINTS_MANUAL = 3;
const LOCATION_UPDATE_INTERVAL = 2000; // 2 seconds

export function CaptureBoundaryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AreasStackParamList>>();
  const route = useRoute<Props['route']>();
  const { mode, zoneId } = route.params;

  const mapRef = useRef<MapView>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  const zone = useOfflineStore((s) => s.getZone(zoneId));

  const [isCapturing, setIsCapturing] = useState(false);
  const [points, setPoints] = useState<CapturedPoint[]>([]);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  const isBoundaryWalk = mode === 'boundary_walk';
  const minPoints = isBoundaryWalk ? MIN_POINTS_BOUNDARY_WALK : MIN_POINTS_MANUAL;

  // Request location permissions and get initial position
  useEffect(() => {
    let mounted = true;

    async function setupLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationError('Location permission is required to capture areas');
          setIsLoadingLocation(false);
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        if (mounted) {
          setCurrentLocation(location);
          setIsLoadingLocation(false);
        }
      } catch (error) {
        if (mounted) {
          setLocationError('Unable to get current location');
          setIsLoadingLocation(false);
        }
      }
    }

    setupLocation();

    return () => {
      mounted = false;
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  // Start continuous tracking for boundary walk
  const startTracking = useCallback(async () => {
    if (!isBoundaryWalk) return;

    setIsCapturing(true);
    setPoints([]);

    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: LOCATION_UPDATE_INTERVAL,
        distanceInterval: 2, // meters
      },
      (location) => {
        const point: CapturedPoint = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy || 10,
          timestamp: new Date().toISOString(),
        };
        setPoints((prev) => [...prev, point]);
        setCurrentLocation(location);
      }
    );
  }, [isBoundaryWalk]);

  // Stop boundary walk tracking
  const stopTracking = useCallback(() => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    setIsCapturing(false);
  }, []);

  // Add point manually (point-by-point mode)
  const addPoint = useCallback(async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const point: CapturedPoint = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || 10,
        timestamp: new Date().toISOString(),
      };

      setPoints((prev) => [...prev, point]);
      setCurrentLocation(location);
    } catch (error) {
      Alert.alert('Error', 'Failed to get GPS location. Please try again.');
    }
  }, []);

  // Remove last point
  const undoLastPoint = useCallback(() => {
    setPoints((prev) => prev.slice(0, -1));
  }, []);

  // Clear all points
  const clearPoints = useCallback(() => {
    Alert.alert(
      'Clear All Points',
      'Are you sure you want to clear all captured points?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => setPoints([]) },
      ]
    );
  }, []);

  // Proceed to review
  const handleProceed = useCallback(() => {
    const validation = validateCapturedPoints(points, { minPoints });

    if (!validation.isValid) {
      Alert.alert('Invalid Boundary', validation.errors.join('\n'));
      return;
    }

    if (validation.warnings.length > 0) {
      Alert.alert(
        'Warnings',
        validation.warnings.join('\n') + '\n\nDo you want to proceed anyway?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Proceed',
            onPress: () => {
              navigation.navigate('ReviewDraft', {
                draftId: null,
                capturedData: {
                  points,
                  zoneId,
                  captureMethod: mode,
                },
              });
            },
          },
        ]
      );
      return;
    }

    navigation.navigate('ReviewDraft', {
      draftId: null,
      capturedData: {
        points,
        zoneId,
        captureMethod: mode,
      },
    });
  }, [points, minPoints, navigation, zoneId, mode]);

  // Calculate current stats
  const area = points.length >= 3 ? calculatePolygonArea(points) : 0;
  const avgAccuracy =
    points.length > 0
      ? points.reduce((sum, p) => sum + p.accuracy, 0) / points.length
      : 0;
  const canProceed = points.length >= minPoints;

  // Fit map to points
  useEffect(() => {
    if (points.length > 0 && mapRef.current) {
      const coordinates = points.map((p) => ({
        latitude: p.latitude,
        longitude: p.longitude,
      }));

      if (currentLocation) {
        coordinates.push({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });
      }

      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 100, right: 50, bottom: 150, left: 50 },
        animated: true,
      });
    }
  }, [points.length, currentLocation]);

  if (isLoadingLocation) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2e7d32" />
          <Text style={styles.loadingText}>Getting GPS location...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (locationError) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>📍</Text>
          <Text style={styles.errorTitle}>Location Required</Text>
          <Text style={styles.errorText}>{locationError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const initialRegion = currentLocation
    ? {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }
    : undefined;

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton
        mapType="satellite"
      >
        {/* Captured boundary */}
        {points.length >= 2 && (
          <Polyline
            coordinates={points.map((p) => ({
              latitude: p.latitude,
              longitude: p.longitude,
            }))}
            strokeColor="#2e7d32"
            strokeWidth={3}
          />
        )}

        {/* Polygon preview if enough points */}
        {points.length >= 3 && (
          <Polygon
            coordinates={points.map((p) => ({
              latitude: p.latitude,
              longitude: p.longitude,
            }))}
            strokeColor="#2e7d32"
            strokeWidth={2}
            fillColor="rgba(46, 125, 50, 0.3)"
          />
        )}

        {/* Point markers */}
        {points.map((point, index) => (
          <Marker
            key={index}
            coordinate={{
              latitude: point.latitude,
              longitude: point.longitude,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.pointMarker}>
              <Text style={styles.pointMarkerText}>{index + 1}</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Stats Panel */}
      <View style={styles.statsPanel}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{points.length}</Text>
          <Text style={styles.statLabel}>Points</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{area.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Hectares</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, avgAccuracy > 20 && styles.warningText]}>
            {avgAccuracy.toFixed(0)}m
          </Text>
          <Text style={styles.statLabel}>GPS Acc.</Text>
        </View>
      </View>

      {/* Zone indicator */}
      <View style={styles.zoneIndicator}>
        <Text style={styles.zoneIndicatorText}>📍 {zone?.name || 'Unknown Zone'}</Text>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {isBoundaryWalk ? (
          // Boundary Walk Controls
          <>
            {!isCapturing ? (
              <TouchableOpacity style={styles.startButton} onPress={startTracking}>
                <Text style={styles.startButtonText}>▶ Start Walking</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.stopButton} onPress={stopTracking}>
                <Text style={styles.stopButtonText}>⏹ Stop Walking</Text>
              </TouchableOpacity>
            )}
            {isCapturing && (
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>Recording...</Text>
              </View>
            )}
          </>
        ) : (
          // Point-by-Point Controls
          <>
            <TouchableOpacity style={styles.addPointButton} onPress={addPoint}>
              <Text style={styles.addPointButtonText}>📍 Drop Point</Text>
            </TouchableOpacity>
            {points.length > 0 && (
              <TouchableOpacity style={styles.undoButton} onPress={undoLastPoint}>
                <Text style={styles.undoButtonText}>↩ Undo</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {points.length > 0 && !isCapturing && (
          <TouchableOpacity style={styles.clearButton} onPress={clearPoints}>
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Proceed Button */}
      {!isCapturing && points.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.proceedButton, !canProceed && styles.proceedButtonDisabled]}
            onPress={handleProceed}
            disabled={!canProceed}
          >
            <Text style={styles.proceedButtonText}>
              {canProceed
                ? 'Review & Save'
                : `Need ${minPoints - points.length} more point${minPoints - points.length > 1 ? 's' : ''}`}
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  errorIcon: {
    fontSize: 48,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  errorText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    maxWidth: 280,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#2e7d32',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  map: {
    flex: 1,
  },
  statsPanel: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  warningText: {
    color: '#f59e0b',
  },
  zoneIndicator: {
    position: 'absolute',
    top: 90,
    left: 16,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  zoneIndicatorText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  pointMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2e7d32',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  pointMarkerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  controls: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  startButton: {
    backgroundColor: '#2e7d32',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  stopButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#dc2626',
  },
  recordingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
  },
  addPointButton: {
    backgroundColor: '#2e7d32',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  addPointButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  undoButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  undoButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  clearButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#fecaca',
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
  },
  proceedButton: {
    backgroundColor: '#2e7d32',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  proceedButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  proceedButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
