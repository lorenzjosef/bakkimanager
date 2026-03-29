import type { TaskDistributionItem, TaskTableRow } from '@bakki/domain';
import { localAssetUrls } from '@bakki/domain';
import {
  ActionButton,
  EmptyStatePanel,
  StatusChip,
  SummaryMetricCard,
  SurfaceCard,
  TableSurface,
} from '@bakki/ui';
import {
  buildAssigneeInitials,
  resolveTaskToneIcon,
  TaskCreateIcon,
} from './task-management.icons';
import {
  getTaskRowActionState,
  type TaskFilterState,
} from './task-management.utils';

export function TaskManagementCanvas({
  activeTasks,
  dueToday,
  distributionItems,
  filters,
  onCreateTask,
  onFilterChange,
  onNavigateToMap,
  onOpenMonitoringResult,
  onOpenWorkflowUpdate,
  rows,
  zoneOptions,
}: {
  activeTasks: string;
  dueToday: string;
  distributionItems: TaskDistributionItem[];
  filters: TaskFilterState;
  onCreateTask: () => void;
  onFilterChange: (patch: Partial<TaskFilterState>) => void;
  onNavigateToMap: () => void;
  onOpenMonitoringResult: (row: TaskTableRow) => void;
  onOpenWorkflowUpdate: (row: TaskTableRow) => void;
  rows: TaskTableRow[];
  zoneOptions: string[];
}) {
  return (
    <>
      <section className="task-figma-canvas">
        <header className="task-figma-header">
          <h1>Task Management</h1>
          <div className="task-figma-summary-cards">
            <SummaryMetricCard
              className="task-figma-summary-card"
              label="Active Tasks"
              value={activeTasks}
            />
            <SummaryMetricCard
              className="task-figma-summary-card is-accent"
              label="Due Today"
              value={dueToday}
            />
          </div>
        </header>

        <section className="task-figma-bento">
          <article className="task-figma-distribution-card">
            <div className="task-figma-card-head">
              <h2>Distribution by Activity</h2>
              <div className="task-figma-live-sync">
                <span>Live Sync</span>
                <i />
              </div>
            </div>

            <div className="task-figma-distribution-grid">
              {distributionItems.map((item) => (
                <TaskDistributionCard key={item.id} item={item} />
              ))}
            </div>
          </article>

          <button className="task-figma-map-card" onClick={onNavigateToMap} type="button">
            <img className="task-figma-map-preview" src={localAssetUrls.taskMap} alt="" />
            <div className="task-figma-map-gradient" />
            <div className="task-figma-map-copy">
              <span>Live Map</span>
              <strong>See Tasks on Map</strong>
              <em>Open in Map Viewer <img src={localAssetUrls.chevronRight} alt="" /></em>
            </div>
          </button>
        </section>

        <section className="task-figma-log-card">
          <div className="task-figma-filter-bar">
            <div className="task-figma-log-actions">
              <ActionButton
                className="task-figma-create"
                label="Create Task"
                leadingClassName="task-figma-action-icon"
                leadingVisual={<TaskCreateIcon />}
                onClick={onCreateTask}
              />
            </div>
          </div>

          <div className="task-figma-filter-panel">
            <label className="task-figma-filter-field">
              <span>Filter By Name</span>
              <input
                className="task-figma-filter-control"
                onChange={(event) => onFilterChange({ nameQuery: event.target.value })}
                placeholder="Search task title"
                type="search"
                value={filters.nameQuery}
              />
            </label>
            <label className="task-figma-filter-field">
              <span>Assignee</span>
              <input
                className="task-figma-filter-control"
                onChange={(event) => onFilterChange({ assigneeQuery: event.target.value })}
                placeholder="Search assignee"
                type="search"
                value={filters.assigneeQuery}
              />
            </label>
            <label className="task-figma-filter-field">
              <span>Priority</span>
              <select
                className="task-figma-filter-control"
                onChange={(event) => onFilterChange({ priority: event.target.value as TaskFilterState['priority'] })}
                value={filters.priority}
              >
                <option value="all">All priorities</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
                <option value="0">No Priority</option>
              </select>
            </label>
            <label className="task-figma-filter-field">
              <span>Activity Type</span>
              <select
                className="task-figma-filter-control"
                onChange={(event) => onFilterChange({ activityType: event.target.value as TaskFilterState['activityType'] })}
                value={filters.activityType}
              >
                <option value="all">All activity types</option>
                <option value="planting">Planting</option>
                <option value="monitoring">Monitoring</option>
                <option value="fertilizing">Fertilizing</option>
              </select>
            </label>
            <label className="task-figma-filter-field">
              <span>Zone</span>
              <select
                className="task-figma-filter-control"
                onChange={(event) => onFilterChange({ zone: event.target.value })}
                value={filters.zone}
              >
                <option value="all">All zones</option>
                {zoneOptions.map((zone) => (
                  <option key={zone} value={zone}>{zone}</option>
                ))}
              </select>
            </label>
            <label className="task-figma-filter-field">
              <span>Sort By</span>
              <select
                className="task-figma-filter-control"
                onChange={(event) => onFilterChange({ sortBy: event.target.value as TaskFilterState['sortBy'] })}
                value={filters.sortBy}
              >
                <option value="due_date_asc">Due Date: Closest First</option>
                <option value="due_date_desc">Due Date: Latest First</option>
                <option value="priority_desc">Priority: High to Low</option>
                <option value="priority_asc">Priority: Low to High</option>
                <option value="title_asc">Name: A to Z</option>
                <option value="assignee_asc">Assignee: A to Z</option>
                <option value="zone_asc">Zone: A to Z</option>
              </select>
            </label>
          </div>

          <TableSurface as="div" cardClassName="task-figma-table-shell">
            <div className="task-figma-table-head">
              <div>Days Left</div>
              <div>Sector / Area</div>
              <div>Activity Type</div>
              <div>Assignee</div>
              <div>Priority</div>
              <div>Status</div>
              <div>Title</div>
              <div>Actions</div>
            </div>

            {rows.length > 0 ? (
              rows.map((row) => (
                <TaskRow
                  key={row.id}
                  onOpenMonitoringResult={() => onOpenMonitoringResult(row)}
                  onOpenWorkflowUpdate={() => onOpenWorkflowUpdate(row)}
                  row={row}
                />
              ))
            ) : (
              <EmptyStatePanel
                className="bakki-table-empty-state"
                heading="No task activity"
                message="Tasks will appear here once templates are instantiated or field work is assigned."
              />
            )}
          </TableSurface>
        </section>
      </section>

    </>
  );
}

function TaskDistributionCard({ item }: { item: TaskDistributionItem }) {
  return (
    <SurfaceCard as="div" className="task-figma-distribution-item">
      <div className="task-figma-distribution-label">
        <span className="task-figma-tone-icon" aria-hidden="true">
          {resolveTaskToneIcon(item.tone)}
        </span>
        <strong className={item.tone === 'monitoring' ? 'is-blue' : item.tone === 'fertilizing' ? 'is-slate' : undefined}>
          {item.label}
        </strong>
      </div>
      <div className="task-figma-progress-track"><span className={`is-${item.tone}`} /></div>
      <span className="task-figma-capacity">{item.capacityLabel}</span>
    </SurfaceCard>
  );
}

function TaskRow({
  onOpenMonitoringResult,
  onOpenWorkflowUpdate,
  row,
}: {
  onOpenMonitoringResult: () => void;
  onOpenWorkflowUpdate: () => void;
  row: TaskTableRow;
}) {
  const { canRecordMonitoring, monitoringActionLabel, workflowActionLabel } = getTaskRowActionState(row);

  return (
    <article className="task-figma-row">
      <div className="task-figma-days-left">{row.daysRemainingLabel}</div>
      <div className="task-figma-sector">
        <strong>{splitCompact(row.sectorTitle)}</strong>
        {row.sectorSubtitle ? <span>{splitCompact(row.sectorSubtitle)}</span> : null}
      </div>
      <div className="task-figma-activity">
        <span className={`task-figma-activity-pill is-${row.activityTone}`}>
          <span className="task-figma-tone-icon" aria-hidden="true">
            {resolveTaskToneIcon(row.activityTone)}
          </span>
          {row.activityType}
        </span>
      </div>
      <div className="task-figma-assignee">
        <span className="task-figma-assignee-avatar" aria-hidden="true">
          {buildAssigneeInitials(row.assigneeName)}
        </span>
        <span>{splitCompact(row.assigneeName)}</span>
      </div>
      <div className="task-figma-priority">
        <span className={`task-figma-priority-pill is-${row.priorityValue}`}>
          {row.priorityLabel}
        </span>
      </div>
      <StatusChip
        className={`task-figma-status is-${row.statusTone}`}
        fallbackVisual={<i />}
        icon={row.statusTone === 'complete' ? <img src={localAssetUrls.verified} alt="" /> : undefined}
        label={row.statusLabel}
      />
      <div className="task-figma-title">{splitCompact(row.titleLabel)}</div>
      <div className="task-figma-actions-cell">
        <div className="task-figma-row-action-stack">
          <button className="task-figma-row-action" onClick={onOpenWorkflowUpdate} type="button">
            {workflowActionLabel}
          </button>
          {canRecordMonitoring ? (
            <button className="task-figma-row-action" onClick={onOpenMonitoringResult} type="button">
              {monitoringActionLabel}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function splitCompact(value: string) {
  return (
    <>
      {value.split(' ').map((part, index, parts) => (
        <span key={`${part}-${index}`}>
          {part}
          {index < parts.length - 1 ? <br /> : null}
        </span>
      ))}
    </>
  );
}
