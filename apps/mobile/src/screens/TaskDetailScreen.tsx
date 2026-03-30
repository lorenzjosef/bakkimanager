import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOfflineStore, type CachedTask } from '@bakki/mobile-offline';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<{ TaskDetail: { taskId: string } }, 'TaskDetail'>;

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
  if (!dateString) return 'Not set';
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>
        {icon && `${icon} `}
        {label}
      </Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export function TaskDetailScreen({ route, navigation }: Props) {
  const { taskId } = route.params;
  const getTask = useOfflineStore((s) => s.getTask);
  const task = getTask(taskId);

  if (!task) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundIcon}>❌</Text>
          <Text style={styles.notFoundTitle}>Task not found</Text>
          <Text style={styles.notFoundSubtitle}>This task may have been removed or is unavailable.</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const priority = PRIORITY_LABELS[task.priority] || PRIORITY_LABELS['1'];
  const taskType = TYPE_LABELS[task.type] || { label: task.type, emoji: '📋' };
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();

  const handleYouTubePress = () => {
    if (task.youtubeUrl) {
      Linking.openURL(task.youtubeUrl);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.typeRow}>
            <Text style={styles.typeEmoji}>{taskType.emoji}</Text>
            <Text style={styles.typeLabel}>{taskType.label}</Text>
            <View style={[styles.priorityBadge, { backgroundColor: priority.color + '20' }]}>
              <Text style={[styles.priorityText, { color: priority.color }]}>{priority.label}</Text>
            </View>
          </View>
          <Text style={styles.title}>{task.title}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.workflowState) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(task.workflowState) }]}>
                {task.workflowState.replace('_', ' ')}
              </Text>
            </View>
          </View>
        </View>

        {/* Description */}
        {task.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{task.description}</Text>
          </View>
        )}

        {/* Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.card}>
            <InfoRow label="Due Date" value={formatDate(task.dueDate)} icon="📅" />
            {task.areaName && (
              <InfoRow
                label="Location"
                value={`${task.areaName}${task.zoneName ? ` • ${task.zoneName}` : ''}`}
                icon="📍"
              />
            )}
            {task.assigneeName && (
              <InfoRow label="Assignee" value={task.assigneeName} icon="👤" />
            )}
            {task.templateName && (
              <InfoRow label="Template" value={task.templateName} icon="📝" />
            )}
            {task.checklistItemCount > 0 && (
              <InfoRow label="Checklist Items" value={`${task.checklistItemCount}`} icon="✅" />
            )}
          </View>
        </View>

        {/* YouTube Instructions */}
        {task.youtubeUrl && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Instructions</Text>
            <TouchableOpacity style={styles.youtubeButton} onPress={handleYouTubePress}>
              <Text style={styles.youtubeIcon}>▶️</Text>
              <Text style={styles.youtubeText}>Watch Video Instructions</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Read-only notice */}
        <View style={styles.notice}>
          <Text style={styles.noticeIcon}>ℹ️</Text>
          <Text style={styles.noticeText}>
            Tasks are read-only in the mobile app. Use the desktop app to update task status.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f8f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  typeEmoji: {
    fontSize: 18,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    textTransform: 'uppercase',
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
    lineHeight: 28,
  },
  statusRow: {
    flexDirection: 'row',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    paddingLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  description: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    maxWidth: '60%',
    textAlign: 'right',
  },
  youtubeButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  youtubeIcon: {
    fontSize: 18,
  },
  youtubeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ef4444',
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    gap: 10,
    marginTop: 8,
  },
  noticeIcon: {
    fontSize: 16,
    marginTop: 1,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
  notFound: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  notFoundIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  notFoundTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  notFoundSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    maxWidth: 280,
  },
  backButton: {
    marginTop: 16,
    backgroundColor: '#2e7d32',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
