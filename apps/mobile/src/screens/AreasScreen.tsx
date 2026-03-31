import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useOfflineStore, type AreaDraft, type DraftSyncStatus } from '@bakki/mobile-offline';
import { useOfflineSync } from '../hooks';
import type { AreasStackParamList } from '../navigation/types';

type AreasNavigationProp = NativeStackNavigationProp<AreasStackParamList, 'AreasList'>;

const SYNC_STATUS_LABELS: Record<DraftSyncStatus, { label: string; color: string; icon: string }> = {
  local: { label: 'Local', color: '#6b7280', icon: '💾' },
  queued: { label: 'Queued', color: '#2563eb', icon: '⏳' },
  syncing: { label: 'Syncing', color: '#2563eb', icon: '🔄' },
  synced: { label: 'Synced', color: '#16a34a', icon: '✓' },
  failed: { label: 'Failed', color: '#dc2626', icon: '⚠️' },
  rejected: { label: 'Rejected', color: '#dc2626', icon: '✕' },
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface DraftCardProps {
  draft: AreaDraft;
  onPress: () => void;
  onSync: () => void;
}

function DraftCard({ draft, onPress, onSync }: DraftCardProps) {
  const status = SYNC_STATUS_LABELS[draft.syncStatus];
  const canSync =
    draft.syncStatus === 'local'
    || draft.syncStatus === 'queued'
    || draft.syncStatus === 'failed';

  return (
    <TouchableOpacity style={styles.draftCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.draftHeader}>
        <Text style={styles.draftName}>{draft.name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
          <Text style={styles.statusIcon}>{status.icon}</Text>
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      <View style={styles.draftDetails}>
        <Text style={styles.draftDetail}>
          📍 {draft.zoneName} • {draft.hectaresTotal.toFixed(2)} ha
        </Text>
        <Text style={styles.draftDetail}>
          📐 {draft.captureMethod === 'boundary_walk' ? 'Boundary Walk' : 'Point-by-Point'}
        </Text>
        <Text style={styles.draftDetail}>📅 {formatDate(draft.createdAt)}</Text>
      </View>

      {draft.syncError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ {draft.syncError}</Text>
        </View>
      )}

      <View style={styles.draftActions}>
        {canSync && (
          <TouchableOpacity style={styles.syncDraftButton} onPress={onSync}>
            <Text style={styles.syncDraftButtonText}>Sync Now</Text>
          </TouchableOpacity>
        )}
        {draft.syncStatus === 'synced' && draft.reviewStatus === 'pending' && (
          <View style={styles.reviewPending}>
            <Text style={styles.reviewPendingText}>⏳ Pending Review</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export function AreasScreen() {
  const navigation = useNavigation<AreasNavigationProp>();
  const { syncData, isSyncing } = useOfflineSync();

  const drafts = useOfflineStore((s) => s.getDrafts());
  const zones = useOfflineStore((s) => s.getZones());
  const queueDraftForSync = useOfflineStore((s) => s.queueDraftForSync);

  const handleCreateArea = useCallback(() => {
    navigation.navigate('CreateArea');
  }, [navigation]);

  const handleDraftPress = useCallback(
    (draft: AreaDraft) => {
      navigation.navigate('ReviewDraft', { draftId: draft.localId });
    },
    [navigation]
  );

  const handleSyncDraft = useCallback(
    (draft: AreaDraft) => {
      queueDraftForSync(draft.localId);
    },
    [queueDraftForSync]
  );

  const handleRefresh = useCallback(() => {
    syncData();
  }, [syncData]);

  const isEmpty = drafts.length === 0;
  const hasZones = zones.length > 0;

  const renderDraft = useCallback(
    ({ item }: { item: AreaDraft }) => (
      <DraftCard
        draft={item}
        onPress={() => handleDraftPress(item)}
        onSync={() => handleSyncDraft(item)}
      />
    ),
    [handleDraftPress, handleSyncDraft]
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {isEmpty ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📍</Text>
          <Text style={styles.emptyTitle}>No Area Drafts</Text>
          <Text style={styles.emptySubtitle}>
            {hasZones
              ? 'Create area boundaries by walking the perimeter or dropping GPS points.'
              : 'Sync data first to load zone boundaries before creating areas.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={drafts}
          renderItem={renderDraft}
          keyExtractor={(item) => item.localId}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isSyncing} onRefresh={handleRefresh} tintColor="#2e7d32" />
          }
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>Draft Areas</Text>
              <Text style={styles.listSubtitle}>
                {drafts.length} draft{drafts.length !== 1 ? 's' : ''}
              </Text>
            </View>
          }
        />
      )}

      {/* Create Area FAB */}
      <TouchableOpacity
        style={[styles.fab, !hasZones && styles.fabDisabled]}
        onPress={handleCreateArea}
        disabled={!hasZones}
      >
        <Text style={styles.fabText}>+ Create Area</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f8f5',
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
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  listHeader: {
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
  },
  listSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  draftCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  draftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  draftName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusIcon: {
    fontSize: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  draftDetails: {
    gap: 4,
  },
  draftDetail: {
    fontSize: 13,
    color: '#6b7280',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
  },
  draftActions: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    flexDirection: 'row',
  },
  syncDraftButton: {
    backgroundColor: '#2e7d32',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  syncDraftButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  reviewPending: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  reviewPendingText: {
    color: '#92400e',
    fontSize: 13,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
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
  fabDisabled: {
    backgroundColor: '#9ca3af',
  },
  fabText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
