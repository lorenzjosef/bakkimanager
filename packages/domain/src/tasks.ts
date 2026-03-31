export type BakkiTaskType = 'planting' | 'monitoring' | 'fertilizing';
export type BakkiWorkflowState = 'pending' | 'in_progress' | 'done' | 'cancelled';
export type BakkiTaskPriority = '0' | '1' | '2' | '3';
export type TaskStatusTone = 'syncing' | 'pending' | 'complete';

export interface TaskDistributionItem {
  id: BakkiTaskType;
  label: string;
  tone: BakkiTaskType;
  capacityLabel: string;
}

export interface TaskTableRow {
  id: string;
  daysRemainingLabel: string;
  dueDateValue: string | null;
  priorityLabel: string;
  priorityValue: BakkiTaskPriority;
  titleLabel: string;
  sectorTitle: string;
  sectorSubtitle: string;
  linkedAreaId?: string;
  workflowState?: BakkiWorkflowState;
  stageLabel?: string | null;
  activityType: string;
  activityTone: BakkiTaskType;
  assigneeName: string;
  statusLabel: string;
  statusTone: TaskStatusTone;
  lastSyncLabel: string;
}

export interface TaskManagementData {
  activeTasks: string;
  dueToday: string;
  distributionItems: TaskDistributionItem[];
  rows: TaskTableRow[];
}

export interface TaskTemplateSummary {
  checklistItemCount: number;
  defaultPriority: number;
  description: string;
  label: string;
  taskType: BakkiTaskType;
  templateRef: string;
  youtubeUrl: string | null;
}

export const taskTemplateSummariesFixture: TaskTemplateSummary[] = [
  {
    templateRef: 'template-planting-default',
    taskType: 'planting',
    label: 'Planting',
    description: 'Deploy saplings into the assigned contract area and record planting progress against the contract goal.',
    youtubeUrl: null,
    defaultPriority: 3,
    checklistItemCount: 4,
  },
  {
    templateRef: 'template-monitoring-default',
    taskType: 'monitoring',
    label: 'Monitoring',
    description: 'Inspect the assigned area, measure live density, and update the latest tree count when available.',
    youtubeUrl: null,
    defaultPriority: 2,
    checklistItemCount: 3,
  },
  {
    templateRef: 'template-fertilizing-default',
    taskType: 'fertilizing',
    label: 'Fertilizing',
    description: 'Apply the planned nutrient treatment and confirm the treated contract area segment.',
    youtubeUrl: null,
    defaultPriority: 2,
    checklistItemCount: 3,
  },
];

export interface CreateTaskRequest {
  templateRef?: string;
  taskType: BakkiTaskType;
  areaId?: string;
  areaLabel: string;
  assigneeProfileId?: string;
  assigneeLabel?: string;
  priority?: BakkiTaskPriority;
  dueDate?: string;
  description: string;
}

export interface CreateTaskResponse {
  createdTaskId: string;
  createdTaskName: string;
  templateRef?: string | null;
  workflowState: BakkiWorkflowState;
  stageLabel: string | null;
  dueDate: string | null;
}

export interface RecordMonitoringResultRequest {
  areaId?: string;
  densityPer100Sqm: number;
  meanDiameterCm?: number;
  meanHeightM?: number;
  treeCount?: number;
  observedAt?: string;
  notes?: string;
  sampledAreaSqm?: number;
}

export interface RecordMonitoringResultResponse {
  taskId: string;
  areaId: string | null;
  observationId: string;
  densityPer100Sqm: number;
  treeCount: number | null;
  recordedAt: string;
}

export interface UpdateTaskWorkflowRequest {
  workflowState: BakkiWorkflowState;
}

export interface UpdateTaskWorkflowResponse {
  stageLabel: string | null;
  taskId: string;
  workflowState: BakkiWorkflowState;
}
