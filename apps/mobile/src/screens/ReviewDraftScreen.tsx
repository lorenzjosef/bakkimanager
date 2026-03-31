import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Polygon, PROVIDER_DEFAULT } from 'react-native-maps';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import Constants from 'expo-constants';
import {
  useOfflineStore,
  type CapturedPoint,
  type CaptureMethod,
  calculatePolygonArea,
  pointsToPolygon,
  getBoundingBox,
} from '@bakki/mobile-offline';
import type { AreasStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AreasStackParamList, 'ReviewDraft'>;

export function ReviewDraftScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AreasStackParamList>>();
  const route = useRoute<Props['route']>();
  const { draftId, capturedData } = route.params;

  const getDraft = useOfflineStore((s) => s.getDraft);
  const getZone = useOfflineStore((s) => s.getZone);
  const createDraft = useOfflineStore((s) => s.createDraft);
  const deleteDraft = useOfflineStore((s) => s.deleteDraft);
  const queueDraftForSync = useOfflineStore((s) => s.queueDraftForSync);

  // If viewing existing draft
  const existingDraft = draftId ? getDraft(draftId) : null;

  // Validate we have either a valid draftId or capturedData
  const hasValidData = !!(existingDraft || (capturedData && capturedData.points && capturedData.points.length >= 3 && capturedData.zoneId));

  // Show error and navigate back if invalid state
  useEffect(() => {
    if (!hasValidData) {
      Alert.alert(
        'Invalid Data',
        'Missing required area data. Please capture the area again.',
        [{ text: 'Go Back', onPress: () => navigation.goBack() }]
      );
    }
  }, [hasValidData, navigation]);

  if (!hasValidData) {
    return null;
  }

  // Points and metadata
  const points: CapturedPoint[] = existingDraft
    ? existingDraft.rawCapturePoints
    : capturedData?.points || [];
  const zoneId = existingDraft ? existingDraft.zoneId : capturedData?.zoneId || '';
  const captureMethod: CaptureMethod = existingDraft
    ? existingDraft.captureMethod
    : capturedData?.captureMethod || 'point_by_point';

  const zone = zoneId ? getZone(zoneId) : undefined;

  const [name, setName] = useState(existingDraft?.name || '');
  const [isSaving, setIsSaving] = useState(false);

  // Calculate geometry
  const geometry = useMemo(() => {
    if (points.length < 3) return null;
    try {
      return pointsToPolygon(points);
    } catch {
      return null;
    }
  }, [points]);

  const areaHectares = useMemo(() => calculatePolygonArea(points), [points]);
  const boundingBox = useMemo(
    () => (points.length > 0 ? getBoundingBox(points) : null),
    [points]
  );
  const avgAccuracy =
    points.length > 0
      ? points.reduce((sum, p) => sum + p.accuracy, 0) / points.length
      : 0;

  const mapRegion = boundingBox
    ? {
        latitude: boundingBox.centerLat,
        longitude: boundingBox.centerLng,
        latitudeDelta: Math.max(0.005, (boundingBox.maxLat - boundingBox.minLat) * 1.5),
        longitudeDelta: Math.max(0.005, (boundingBox.maxLng - boundingBox.minLng) * 1.5),
      }
    : undefined;

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter a name for this area.');
      return;
    }

    if (!geometry) {
      Alert.alert('Invalid Geometry', 'Unable to create area polygon. Please recapture with at least 3 points.');
      return;
    }

    if (!zone) {
      Alert.alert('Zone Not Found', 'The selected zone could not be found. Please go back and try again.');
      return;
    }

    setIsSaving(true);

    try {
      const draft = await createDraft({
        name: name.trim(),
        zoneId,
        zoneName: zone.name,
        geometry,
        hectaresTotal: areaHectares,
        captureMethod,
        rawCapturePoints: points,
        averageGpsAccuracy: avgAccuracy,
        deviceInfo: {
          platform: Platform.OS as 'ios' | 'android',
          osVersion: Platform.Version.toString(),
          appVersion: Constants.expoConfig?.version || '0.1.0',
        },
      });

      Alert.alert(
        'Area Saved',
        'Your area draft has been saved locally. Sync when you have internet connection.',
        [
          {
            text: 'Sync Now',
            onPress: () => {
              queueDraftForSync(draft.localId);
              navigation.popToTop();
            },
          },
          {
            text: 'Later',
            onPress: () => navigation.popToTop(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save area draft. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [
    name,
    geometry,
    zone,
    zoneId,
    areaHectares,
    captureMethod,
    points,
    avgAccuracy,
    createDraft,
    queueDraftForSync,
    navigation,
  ]);

  const handleDelete = useCallback(() => {
    if (!existingDraft) return;

    Alert.alert(
      'Delete Draft',
      'Are you sure you want to delete this area draft? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteDraft(existingDraft.localId);
            navigation.goBack();
          },
        },
      ]
    );
  }, [existingDraft, deleteDraft, navigation]);

  const handleSync = useCallback(() => {
    if (!existingDraft) return;
    queueDraftForSync(existingDraft.localId);
    Alert.alert('Queued for Sync', 'This draft will sync when you have internet connection.');
  }, [existingDraft, queueDraftForSync]);

  const isEditable = !existingDraft;
  const canSync =
    existingDraft &&
    (
      existingDraft.syncStatus === 'local'
      || existingDraft.syncStatus === 'failed'
      || existingDraft.syncStatus === 'queued'
    );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Map Preview */}
        <View style={styles.mapContainer}>
          {mapRegion && (
            <MapView
              style={styles.map}
              provider={PROVIDER_DEFAULT}
              initialRegion={mapRegion}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
              mapType="satellite"
            >
              {points.length >= 3 && (
                <Polygon
                  coordinates={points.map((p) => ({
                    latitude: p.latitude,
                    longitude: p.longitude,
                  }))}
                  strokeColor="#2e7d32"
                  strokeWidth={2}
                  fillColor="rgba(46, 125, 50, 0.4)"
                />
              )}
            </MapView>
          )}
        </View>

        {/* Name Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Area Name</Text>
          <TextInput
            style={styles.nameInput}
            placeholder="Enter area name..."
            placeholderTextColor="#9ca3af"
            value={name}
            onChangeText={setName}
            editable={isEditable}
            maxLength={50}
          />
        </View>

        {/* Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>📍 Zone</Text>
              <Text style={styles.detailValue}>{zone?.name || 'Unknown'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>📐 Size</Text>
              <Text style={styles.detailValue}>{areaHectares.toFixed(2)} hectares</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>🔢 Points</Text>
              <Text style={styles.detailValue}>{points.length} GPS points</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>📡 GPS Accuracy</Text>
              <Text
                style={[styles.detailValue, avgAccuracy > 20 && styles.warningValue]}
              >
                ±{avgAccuracy.toFixed(1)}m average
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>🚶 Capture Method</Text>
              <Text style={styles.detailValue}>
                {captureMethod === 'boundary_walk' ? 'Boundary Walk' : 'Point-by-Point'}
              </Text>
            </View>
          </View>
        </View>

        {/* Existing Draft Status */}
        {existingDraft && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Status</Text>
            <View style={styles.statusCard}>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Sync Status</Text>
                <Text style={styles.statusValue}>{existingDraft.syncStatus}</Text>
              </View>
              {existingDraft.syncError && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠️ {existingDraft.syncError}</Text>
                </View>
              )}
              {existingDraft.syncStatus === 'synced' && (
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Review Status</Text>
                  <Text style={styles.statusValue}>{existingDraft.reviewStatus}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* GPS Quality Notice */}
        {avgAccuracy > 15 && (
          <View style={styles.warningBox}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>
              GPS accuracy is lower than ideal. The boundary may need adjustment during
              desktop review.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Footer Actions */}
      <View style={styles.footer}>
        {isEditable ? (
          <TouchableOpacity
            style={[styles.saveButton, (!name.trim() || isSaving) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!name.trim() || isSaving}
          >
            <Text style={styles.saveButtonText}>
              {isSaving ? 'Saving...' : 'Save Area Draft'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.draftActions}>
            {canSync && (
              <TouchableOpacity style={styles.syncButton} onPress={handleSync}>
                <Text style={styles.syncButtonText}>🔄 Sync Now</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Text style={styles.deleteButtonText}>🗑 Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f8f5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 100,
  },
  mapContainer: {
    height: 200,
    backgroundColor: '#e5e7eb',
  },
  map: {
    flex: 1,
  },
  section: {
    padding: 16,
    paddingBottom: 0,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  nameInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1f2937',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  warningValue: {
    color: '#f59e0b',
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    textTransform: 'capitalize',
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#dc2626',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    gap: 12,
  },
  warningIcon: {
    fontSize: 18,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
    lineHeight: 18,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#f5f8f5',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  saveButton: {
    backgroundColor: '#2e7d32',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  draftActions: {
    flexDirection: 'row',
    gap: 12,
  },
  syncButton: {
    flex: 1,
    backgroundColor: '#2e7d32',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: '#fecaca',
  },
  deleteButtonText: {
    color: '#dc2626',
    fontSize: 15,
    fontWeight: '600',
  },
});
