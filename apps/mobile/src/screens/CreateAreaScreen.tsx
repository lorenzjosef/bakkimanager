import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useOfflineStore, type CaptureMethod } from '@bakki/mobile-offline';
import type { AreasStackParamList } from '../navigation/types';

type CreateAreaNavigationProp = NativeStackNavigationProp<AreasStackParamList, 'CreateArea'>;

export function CreateAreaScreen() {
  const navigation = useNavigation<CreateAreaNavigationProp>();
  const zones = useOfflineStore((s) => s.getZones());

  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<CaptureMethod | null>(null);

  const selectedZone = zones.find((z) => z.id === selectedZoneId);
  const canProceed = selectedZoneId && selectedMethod;

  const handleProceed = useCallback(() => {
    if (!selectedZoneId || !selectedMethod) return;
    navigation.navigate('CaptureBoundary', {
      mode: selectedMethod,
      zoneId: selectedZoneId,
    });
  }, [navigation, selectedZoneId, selectedMethod]);

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Step 1: Select Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Select Zone</Text>
          <Text style={styles.sectionSubtitle}>
            Choose which zone this area will belong to
          </Text>

          <View style={styles.optionsGrid}>
            {zones.map((zone) => (
              <TouchableOpacity
                key={zone.id}
                style={[
                  styles.zoneOption,
                  selectedZoneId === zone.id && styles.optionSelected,
                ]}
                onPress={() => setSelectedZoneId(zone.id)}
              >
                <Text
                  style={[
                    styles.zoneOptionText,
                    selectedZoneId === zone.id && styles.optionTextSelected,
                  ]}
                >
                  {zone.name}
                </Text>
                <Text
                  style={[
                    styles.zoneOptionDetail,
                    selectedZoneId === zone.id && styles.optionDetailSelected,
                  ]}
                >
                  {zone.hectaresEstimate.toFixed(1)} ha
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Step 2: Select Capture Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Capture Method</Text>
          <Text style={styles.sectionSubtitle}>
            Choose how you want to define the area boundary
          </Text>

          <TouchableOpacity
            style={[
              styles.methodOption,
              selectedMethod === 'boundary_walk' && styles.optionSelected,
            ]}
            onPress={() => setSelectedMethod('boundary_walk')}
          >
            <View style={styles.methodIconContainer}>
              <Text style={styles.methodIcon}>🚶</Text>
            </View>
            <View style={styles.methodContent}>
              <Text
                style={[
                  styles.methodTitle,
                  selectedMethod === 'boundary_walk' && styles.optionTextSelected,
                ]}
              >
                Boundary Walk
              </Text>
              <Text style={styles.methodDescription}>
                Walk the perimeter while the app tracks your GPS position continuously
              </Text>
            </View>
            {selectedMethod === 'boundary_walk' && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.methodOption,
              selectedMethod === 'point_by_point' && styles.optionSelected,
            ]}
            onPress={() => setSelectedMethod('point_by_point')}
          >
            <View style={styles.methodIconContainer}>
              <Text style={styles.methodIcon}>📍</Text>
            </View>
            <View style={styles.methodContent}>
              <Text
                style={[
                  styles.methodTitle,
                  selectedMethod === 'point_by_point' && styles.optionTextSelected,
                ]}
              >
                Point-by-Point
              </Text>
              <Text style={styles.methodDescription}>
                Drop individual GPS markers at each corner of the area
              </Text>
            </View>
            {selectedMethod === 'point_by_point' && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Summary */}
        {selectedZone && selectedMethod && (
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Ready to capture</Text>
            <Text style={styles.summaryText}>
              You'll create a new area in <Text style={styles.bold}>{selectedZone.name}</Text> using{' '}
              <Text style={styles.bold}>
                {selectedMethod === 'boundary_walk' ? 'boundary walk' : 'point-by-point'}
              </Text>{' '}
              capture.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Proceed Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.proceedButton, !canProceed && styles.proceedButtonDisabled]}
          onPress={handleProceed}
          disabled={!canProceed}
        >
          <Text style={styles.proceedButtonText}>Start Capture</Text>
        </TouchableOpacity>
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
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  zoneOption: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    minWidth: '45%',
    flex: 1,
  },
  optionSelected: {
    borderColor: '#2e7d32',
    backgroundColor: '#f0fdf4',
  },
  zoneOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  zoneOptionDetail: {
    fontSize: 13,
    color: '#6b7280',
  },
  optionTextSelected: {
    color: '#166534',
  },
  optionDetailSelected: {
    color: '#15803d',
  },
  methodOption: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  methodIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  methodIcon: {
    fontSize: 24,
  },
  methodContent: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  methodDescription: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  checkmark: {
    fontSize: 20,
    color: '#2e7d32',
    fontWeight: '700',
  },
  summary: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#1e3a8a',
    lineHeight: 20,
  },
  bold: {
    fontWeight: '700',
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
  proceedButton: {
    backgroundColor: '#2e7d32',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
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
