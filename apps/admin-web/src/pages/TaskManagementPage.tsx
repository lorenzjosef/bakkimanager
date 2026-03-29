import { useNavigate } from '@tanstack/react-router';
import { useDeferredValue, useMemo, useState } from 'react';
import type { TaskTableRow } from '@bakki/domain';
import { PageStatePanel } from '@bakki/ui';
import { useTaskManagementData } from '@/queries/tasks';
import { useUIStore } from '@/store/ui';
import {
  MonitoringResultModal,
  TaskManagementCanvas,
  WorkflowUpdateModal,
} from './task-management.sections';
import {
  DEFAULT_TASK_FILTERS,
  filterAndSortTaskRows,
  getTaskZoneOptions,
  resolveTaskManagementRenderState,
} from './task-management.utils';

export function TaskManagementPage() {
  const navigate = useNavigate();
  const openMapTaskModal = useUIStore((state) => state.openMapTaskModal);
  const [filters, setFilters] = useState(DEFAULT_TASK_FILTERS);
  const [monitoringRow, setMonitoringRow] = useState<TaskTableRow | null>(null);
  const [workflowRow, setWorkflowRow] = useState<TaskTableRow | null>(null);
  const { data: taskManagement, error, isPending, refetch } = useTaskManagementData();
  const renderState = resolveTaskManagementRenderState(taskManagement, isPending);
  const deferredNameQuery = useDeferredValue(filters.nameQuery);
  const deferredAssigneeQuery = useDeferredValue(filters.assigneeQuery);
  const filteredRows = useMemo(() => filterAndSortTaskRows(taskManagement?.rows ?? [], {
    ...filters,
    assigneeQuery: deferredAssigneeQuery,
    nameQuery: deferredNameQuery,
  }), [
    deferredAssigneeQuery,
    deferredNameQuery,
    filters,
    taskManagement?.rows,
  ]);
  const zoneOptions = useMemo(
    () => getTaskZoneOptions(taskManagement?.rows ?? []),
    [taskManagement?.rows],
  );

  if (renderState === 'loading') {
    return (
      <section className="view is-active" id="view-task-management">
        <div className="page-content task-figma-page">
          <PageStatePanel
            eyebrow="Task Management"
            heading="Loading task data"
            message="Loading task activity, assignments, and current workload distribution."
          />
        </div>
      </section>
    );
  }

  if (renderState === 'unavailable') {
    return (
      <section className="view is-active" id="view-task-management">
        <div className="page-content task-figma-page">
          <PageStatePanel
            action={{ label: 'Retry', onAction: () => void refetch() }}
            eyebrow="Task Management"
            heading="Task data unavailable"
            message={error instanceof Error ? error.message : 'Task activity could not be loaded.'}
            tone="error"
          />
        </div>
      </section>
    );
  }

  if (!taskManagement) {
    return null;
  }

  return (
    <section className="view is-active" id="view-task-management">
      <div className="page-content task-figma-page">
        <TaskManagementCanvas
          activeTasks={taskManagement.activeTasks}
          distributionItems={taskManagement.distributionItems}
          dueToday={taskManagement.dueToday}
          onCreateTask={() => openMapTaskModal()}
          onFilterChange={(patch) => setFilters((current) => ({ ...current, ...patch }))}
          onNavigateToMap={() => navigate({ to: '/map-viewer' })}
          onOpenMonitoringResult={setMonitoringRow}
          onOpenWorkflowUpdate={setWorkflowRow}
          filters={filters}
          rows={filteredRows}
          zoneOptions={zoneOptions}
        />
        <MonitoringResultModal
          isOpen={Boolean(monitoringRow)}
          onClose={() => setMonitoringRow(null)}
          row={monitoringRow}
        />
        <WorkflowUpdateModal
          isOpen={Boolean(workflowRow)}
          onClose={() => setWorkflowRow(null)}
          row={workflowRow}
        />
      </div>
    </section>
  );
}
