import type {
  BakkiTaskPriority,
  BakkiTaskType,
  CreateTaskRequest,
  TaskTemplateSummary,
  UserRecord,
} from '@bakki/domain';
import { localAssetUrls } from '@bakki/domain';

export interface TaskTypeOption {
  description: string;
  defaultPriority: BakkiTaskPriority;
  icon: string;
  id: BakkiTaskType;
  label: string;
  templateRef: string;
}

export const TASK_PRIORITY_OPTIONS: Array<{
  label: string;
  value: BakkiTaskPriority;
}> = [
  { value: '0', label: 'No Priority' },
  { value: '1', label: '1 Star' },
  { value: '2', label: '2 Stars' },
  { value: '3', label: '3 Stars' },
];

export function mapTemplateToOption(template: TaskTemplateSummary): TaskTypeOption {
  return {
    defaultPriority: normalizeTaskPriorityValue(template.defaultPriority),
    id: template.taskType,
    label: template.label,
    description: template.description,
    templateRef: template.templateRef,
    icon:
      template.taskType === 'monitoring'
        ? localAssetUrls.mapTaskMonitoring
        : template.taskType === 'fertilizing'
          ? localAssetUrls.mapTaskFertilizing
          : localAssetUrls.mapTaskPlanting,
  };
}

export function canSubmitCreateTask(
  areaId: string | null,
  description: string,
  isPending: boolean,
) {
  return Boolean(areaId?.trim()) && description.trim().length > 3 && !isPending;
}

export function buildCreateTaskPayload(input: {
  priority: BakkiTaskPriority;
  templateRef: string | null;
  taskType: BakkiTaskType;
  areaId: string | null;
  areaLabel: string;
  assigneeProfileId: string | null;
  assigneeLabel: string;
  dueDate: string;
  description: string;
}): CreateTaskRequest {
  return {
    priority: input.priority,
    templateRef: input.templateRef || undefined,
    taskType: input.taskType,
    areaId: input.areaId || undefined,
    areaLabel: input.areaLabel.trim(),
    assigneeProfileId: input.assigneeProfileId || undefined,
    assigneeLabel: input.assigneeLabel.trim() || undefined,
    dueDate: input.dueDate || undefined,
    description: input.description.trim(),
  };
}

export function filterPlanterOptions(planters: UserRecord[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return planters;
  }

  return planters.filter((planter) => {
    const fullName = planter.fullName.toLowerCase();
    const username = planter.username.toLowerCase();
    const roleLabel = planter.roleLabel.toLowerCase();
    return (
      fullName.includes(normalizedQuery)
      || username.includes(normalizedQuery)
      || roleLabel.includes(normalizedQuery)
    );
  });
}

export function normalizeTaskPriorityValue(value: number | string | null | undefined): BakkiTaskPriority {
  const normalized = String(value ?? '0');
  if (normalized === '1' || normalized === '2' || normalized === '3') {
    return normalized;
  }

  return '0';
}
