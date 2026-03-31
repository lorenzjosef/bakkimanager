import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  useOfflineStore,
  type CachedTask,
  type TaskFilters,
  type TaskSortField,
  type SortDirection,
} from '@bakki/mobile-offline';
import { useOfflineSync } from '../hooks';
import type { TaskStackParamList } from '../navigation/types';

type FilterTab = 'all' | 'pending' | 'in_progress' | 'done';
type TasksNavigationProp = NativeStackNavigationProp<TaskStackParamList, 'TaskList'>;

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  '0': { label: 'Low', color: '#6b7280' },
  '1': { label: 'Normal', color: '#2563eb' },
  '2': { label: 'High', color: '#f59e0b' },
  '3': { label: 'Urgent', color: '#dc2626' },
};

const TYPE_LABELS: Record<string, { label: string; emoji: string }> = {
  planting: { label: 'Planting', emoji: '🌱' },
  monitoring: { label: 'Monitoring', emoji: '👁️' },
  fertilizing: { label: 'Fertilizing', emoji: '🧪' },
};

function formatDate(dateString: string | null): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays <= 7) return `${diffDays}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function TaskCard({ task, onPress }: { task: CachedTask; onPress: () => void }) {
  const priority = PRIORITY_LABELS[task.priority] || PRIORITY_LABELS['1'];
  const taskType = TYPE_LABELS[task.type] || { label: task.type, emoji: '📋' };
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();

  return (
    <TouchableOpacity style={styles.taskCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.taskHeader}>
        <View style={styles.taskTypeContainer}>
          <Text style={styles.taskTypeEmoji}>{taskType.emoji}</Text>
          <Text style={styles.taskTypeLabel}>{taskType.label}</Text>
        </View>
        <View style={[styles.priorityBadge, { backgroundColor: priority.color + '20' }]}>
          <Text style={[styles.priorityText, { color: priority.color }]}>{priority.label}</Text>
        </View>
      </View>

      <Text style={styles.taskTitle} numberOfLines={2}>
        {task.title}
      </Text>

      {task.areaName && (
        <View style={styles.taskLocation}>
          <Text style={styles.locationIcon}>📍</Text>
          <Text style={styles.locationText} numberOfLines={1}>
            {task.areaName}
            {task.zoneName ? ` • ${task.zoneName}` : ''}
          </Text>
        </View>
      )}

      <View style={styles.taskFooter}>
        <View style={styles.dueDateContainer}>
          <Text style={styles.calendarIcon}>📅</Text>
          <Text style={[styles.dueDate, isOverdue && styles.dueDateOverdue]}>
            {formatDate(task.dueDate)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.workflowState) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(task.workflowState) }]}>
            {task.workflowState.replace('_', ' ')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return '#6b7280';
    case 'in_progress':
      return '#2563eb';
    case 'done':
      return '#16a34a';
    case 'cancelled':
      return '#9ca3af';
    default:
      return '#6b7280';
  }
}

export function TasksScreen() {
  const navigation = useNavigation<TasksNavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [sortField, setSortField] = useState<TaskSortField>('dueDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const { syncData, isSyncing, syncStatus, lastSyncAt } = useOfflineSync();
  const getTasks = useOfflineStore((s) => s.getTasks);

  const tasks = useMemo(() => {
    const filters: TaskFilters = {};

    if (activeTab !== 'all') {
      filters.workflowState = [activeTab as 'pending' | 'in_progress' | 'done'];
    }

    if (searchQuery.trim()) {
      filters.search = searchQuery.trim();
    }

    return getTasks(filters, { field: sortField, direction: sortDirection });
  }, [getTasks, activeTab, searchQuery, sortField, sortDirection]);

  const handleRefresh = useCallback(() => {
    syncData();
  }, [syncData]);

  const handleTaskPress = useCallback((task: CachedTask) => {
    navigation.navigate('TaskDetail', { taskId: task.id });
  }, [navigation]);

  const toggleSort = useCallback(() => {
    if (sortField === 'dueDate') {
      setSortField('priority');
    } else {
      setSortField('dueDate');
    }
  }, [sortField]);

  const renderTask = useCallback(
    ({ item }: { item: CachedTask }) => <TaskCard task={item} onPress={() => handleTaskPress(item)} />,
    [handleTaskPress]
  );

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'in_progress', label: 'Active' },
    { key: 'done', label: 'Done' },
  ];

  const isEmpty = tasks.length === 0;
  const isInitialLoad = syncStatus === 'stale' && !lastSyncAt;

  if (isInitialLoad && isSyncing) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2e7d32" />
          <Text style={styles.loadingText}>Loading tasks...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search tasks..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.sortButton} onPress={toggleSort}>
          <Text style={styles.sortIcon}>{sortField === 'dueDate' ? '📅' : '⚡'}</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Task List */}
      {isEmpty ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No tasks found</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? 'Try adjusting your search'
              : activeTab !== 'all'
              ? `No ${activeTab.replace('_', ' ')} tasks`
              : 'Your assigned tasks will appear here after sync'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
          renderItem={renderTask}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isSyncing} onRefresh={handleRefresh} tintColor="#2e7d32" />
          }
        />
      )}

      {/* Sync Status */}
      {syncStatus === 'error' && (
        <View style={styles.syncError}>
          <Text style={styles.syncErrorText}>⚠️ Offline mode - showing cached data</Text>
        </View>
      )}
    </SafeAreaView>
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
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchIcon: {
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1f2937',
  },
  clearIcon: {
    fontSize: 14,
    color: '#9ca3af',
    padding: 4,
  },
  sortButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
  },
  sortIcon: {
    fontSize: 20,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  tabActive: {
    backgroundColor: '#2e7d32',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4b5563',
  },
  tabTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 12,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taskTypeEmoji: {
    fontSize: 14,
  },
  taskTypeLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
    lineHeight: 22,
  },
  taskLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  locationIcon: {
    fontSize: 12,
  },
  locationText: {
    fontSize: 13,
    color: '#6b7280',
    flex: 1,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  calendarIcon: {
    fontSize: 12,
  },
  dueDate: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  dueDateOverdue: {
    color: '#dc2626',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
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
  syncError: {
    backgroundColor: '#fef3c7',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#fcd34d',
  },
  syncErrorText: {
    fontSize: 13,
    color: '#92400e',
    textAlign: 'center',
  },
});
