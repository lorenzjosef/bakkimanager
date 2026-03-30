import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Placeholder component - will be enhanced in Phase 5
export function AreasScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <View style={styles.content}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📍</Text>
          <Text style={styles.emptyTitle}>Areas</Text>
          <Text style={styles.emptySubtitle}>
            Create and manage area boundaries. Draft areas will sync when online.
          </Text>
        </View>

        <TouchableOpacity style={styles.createButton} disabled>
          <Text style={styles.createButtonText}>+ Create Area</Text>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 32,
  },
  emptyState: {
    alignItems: 'center',
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
  },
  createButton: {
    backgroundColor: '#2e7d32',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    opacity: 0.5,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
