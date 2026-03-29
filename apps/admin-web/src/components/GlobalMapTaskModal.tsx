import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import type { BakkiTaskPriority, BakkiTaskType } from '@bakki/domain';
import { localAssetUrls } from '@bakki/domain';
import { InlineStatusBanner } from '@bakki/ui';
import {
  TaskCalendarIcon,
  TaskChevronDownIcon,
  TaskDeployIcon,
  TaskDraftIcon,
  TaskPersonnelIcon,
  resolveTaskToneIcon,
} from '@/pages/task-management.icons';
import { useMapManagementData } from '@/queries/map';
import { useCreateTaskMutation, useTaskTemplatesData } from '@/queries/tasks';
import { useUserManagementData } from '@/queries/users';
import { useUIStore } from '@/store/ui';
import {
  buildCreateTaskPayload,
  canSubmitCreateTask,
  filterPlanterOptions,
  mapTemplateToOption,
  normalizeTaskPriorityValue,
  TASK_PRIORITY_OPTIONS,
  type TaskTypeOption,
} from './global-map-task-modal.utils';

export function GlobalMapTaskModal() {
  const isOpen = useUIStore((state) => state.mapTaskModalOpen);
  const contextAreaId = useUIStore((state) => state.mapTaskAreaId);
  const close = useUIStore((state) => state.closeMapTaskModal);
  const {
    data: mapManagementData,
    error: areaCatalogError,
    isPending: areaCatalogPending,
  } = useMapManagementData();
  const {
    data: planterDirectory,
    error: planterDirectoryError,
    isPending: planterDirectoryPending,
  } = useUserManagementData('planter');
  const {
    mutateAsync,
    reset,
    isPending,
    isError,
    error,
  } = useCreateTaskMutation();
  const {
    data: taskTemplateData,
    error: templateError,
    isPending: templatesPending,
  } = useTaskTemplatesData();

  const [taskType, setTaskType] = useState<BakkiTaskType>('planting');
  const [priority, setPriority] = useState<BakkiTaskPriority>('0');
  const [templateRef, setTemplateRef] = useState<string | null>(null);
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [areaId, setAreaId] = useState<string | null>(null);
  const [personnelQuery, setPersonnelQuery] = useState('');
  const [selectedPlanterId, setSelectedPlanterId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);
  const deferredPersonnelQuery = useDeferredValue(personnelQuery);

  const zoneOptions = useMemo(
    () =>
      Object.entries(mapManagementData?.zonesById ?? {})
        .sort((left, right) => {
          return left[1].zoneName.localeCompare(right[1].zoneName);
        })
        .map(([id, zone]) => ({
          zoneId: id,
          zoneName: zone.zoneName,
        })),
    [mapManagementData],
  );
  const areaOptions = useMemo(
    () =>
      Object.values(mapManagementData?.areasById ?? {})
        .sort((left, right) => {
          const zoneOrder = left.zoneName.localeCompare(right.zoneName);
          return zoneOrder !== 0 ? zoneOrder : left.areaName.localeCompare(right.areaName);
        })
        .map((area) => ({
          areaId: area.areaId,
          areaName: area.areaName,
          displayLabel: area.areaName,
          submitLabel: area.areaName,
          zoneId: area.zoneId,
          zoneName: area.zoneName,
        })),
    [mapManagementData],
  );
  const planterOptions = useMemo(
    () =>
      (planterDirectory?.registryUsers ?? [])
        .filter((user) => user.isActive && !user.isOwner)
        .sort((left, right) => left.fullName.localeCompare(right.fullName)),
    [planterDirectory],
  );
  const filteredPlanterOptions = useMemo(
    () => filterPlanterOptions(planterOptions, deferredPersonnelQuery),
    [deferredPersonnelQuery, planterOptions],
  );
  const selectedPlanter = useMemo(
    () => planterOptions.find((planter) => planter.id === selectedPlanterId) ?? null,
    [planterOptions, selectedPlanterId],
  );
  const visiblePlanterOptions = useMemo(() => {
    if (!selectedPlanter) {
      return filteredPlanterOptions;
    }

    return filteredPlanterOptions.some((planter) => planter.id === selectedPlanter.id)
      ? filteredPlanterOptions
      : [selectedPlanter, ...filteredPlanterOptions];
  }, [filteredPlanterOptions, selectedPlanter]);
  const selectedZone = useMemo(
    () => zoneOptions.find((option) => option.zoneId === zoneId) ?? null,
    [zoneId, zoneOptions],
  );
  const zoneAreaOptions = useMemo(
    () => areaOptions.filter((option) => option.zoneId === zoneId),
    [areaOptions, zoneId],
  );
  const selectedArea = useMemo(
    () => areaOptions.find((option) => option.areaId === areaId) ?? null,
    [areaId, areaOptions],
  );

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const defaultTemplate = taskTemplateData?.[0] ?? null;
    const preselectedArea = areaOptions.find((option) => option.areaId === contextAreaId) ?? null;
    setTaskType(defaultTemplate?.taskType ?? 'planting');
    setPriority(normalizeTaskPriorityValue(defaultTemplate?.defaultPriority ?? 0));
    setTemplateRef(defaultTemplate?.templateRef ?? null);
    setZoneId(preselectedArea?.zoneId ?? null);
    setAreaId(preselectedArea?.areaId ?? null);
    setPersonnelQuery('');
    setSelectedPlanterId(null);
    setDueDate('');
    setDescription('');
    setSuccessMessage(null);
    reset();
  }, [areaOptions, contextAreaId, isOpen, reset, taskTemplateData]);

  const taskTypeOptions = useMemo(
    () => (taskTemplateData ?? []).map(mapTemplateToOption),
    [taskTemplateData],
  );

  const canSubmit = useMemo(
    () => taskTypeOptions.length > 0 && canSubmitCreateTask(selectedArea?.areaId ?? null, description, isPending),
    [description, isPending, selectedArea?.areaId, taskTypeOptions.length],
  );

  if (!isOpen) {
    return null;
  }

  const submit = async () => {
    if (!selectedArea) {
      return;
    }

    const result = await mutateAsync(buildCreateTaskPayload({
      priority,
      templateRef,
      taskType,
      areaId: selectedArea.areaId,
      areaLabel: selectedArea.submitLabel,
      assigneeProfileId: selectedPlanterId,
      assigneeLabel: selectedPlanter?.fullName ?? '',
      dueDate,
      description,
    }));

    setSuccessMessage(`${result.createdTaskName} created.`);
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = window.setTimeout(() => {
      close();
    }, 600);
  };

  return (
    <div className="map-task-modal-shell" id="map-task-modal">
      <div className="map-task-modal-backdrop" onClick={close} />
      <section className="map-task-figma-card" role="dialog" aria-modal="true" aria-labelledby="map-task-modal-title" data-node-id="58:1411">
        <header className="map-task-figma-header" data-node-id="58:1412">
          <div className="map-task-figma-heading">
            <h2 id="map-task-modal-title">Create New Task</h2>
            <p>Assign a new operational goal to the field team</p>
          </div>
          <button className="map-task-figma-close" aria-label="Close task creation" onClick={close} type="button">
            <img src={localAssetUrls.close} alt="" />
          </button>
        </header>

        <div className="map-task-figma-body" data-node-id="58:1421">
          {isError ? (
            <InlineStatusBanner
              heading="Task creation failed"
              message={error instanceof Error ? error.message : 'The task could not be created.'}
              tone="error"
            />
          ) : null}
          {successMessage ? (
            <InlineStatusBanner
              heading="Task created"
              message={successMessage}
              tone="neutral"
            />
          ) : null}
          {templateError ? (
            <InlineStatusBanner
              heading="Task templates unavailable"
              message={
                templateError instanceof Error
                  ? templateError.message
                  : 'The task template catalog could not be loaded.'
              }
              tone="error"
            />
          ) : null}
          {!templateError && !templatesPending && taskTypeOptions.length === 0 ? (
            <InlineStatusBanner
              heading="No task templates available"
              message="No active Bakki task templates are available for task creation."
              tone="warning"
            />
          ) : null}
          {areaCatalogError ? (
            <InlineStatusBanner
              heading="Area catalog unavailable"
              message={
                areaCatalogError instanceof Error
                  ? areaCatalogError.message
                  : 'The live area list could not be loaded.'
              }
              tone="error"
            />
          ) : null}
          {planterDirectoryError ? (
            <InlineStatusBanner
              heading="Personnel registry unavailable"
              message={
                planterDirectoryError instanceof Error
                  ? planterDirectoryError.message
                  : 'The live personnel list could not be loaded.'
              }
              tone="error"
            />
          ) : null}

          <section className="map-task-figma-field">
            <h3>Task Type</h3>
            <div className="map-task-figma-type-grid">
              {taskTypeOptions.map((option) => (
                <button
                  className={`map-task-figma-type${taskType === option.id ? ' is-active' : ''}`}
                  key={option.id}
                  onClick={() => {
                    setTaskType(option.id);
                    setPriority(option.defaultPriority);
                    setTemplateRef(option.templateRef);
                  }}
                  type="button"
                >
                  <span className="map-task-figma-type-icon" aria-hidden="true">
                    {resolveTaskToneIcon(option.id)}
                  </span>
                  <div className="map-task-figma-type-copy">
                    <strong>{option.label}</strong>
                    <span>{option.description}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <div className="map-task-figma-grid">
            <label className="map-task-figma-field">
              <span>Area Assignment</span>
              <div className="map-task-figma-field-stack">
                <div className="map-task-figma-input map-task-figma-select map-task-figma-input-has-trailing">
                  <select
                    className="map-task-figma-control map-task-figma-select-control"
                    onChange={(event) => {
                      const nextZoneId = event.target.value || null;
                      setZoneId(nextZoneId);
                      setAreaId(null);
                    }}
                    value={selectedZone?.zoneId ?? zoneId ?? ''}
                  >
                    <option value="">
                      {areaCatalogPending ? 'Loading zones...' : 'Select a zone'}
                    </option>
                    {zoneOptions.map((option) => (
                      <option key={option.zoneId} value={option.zoneId}>
                        {option.zoneName}
                      </option>
                    ))}
                  </select>
                  <TaskChevronDownIcon className="map-task-figma-inline-icon map-task-figma-chevron" />
                </div>
                <div className="map-task-figma-input map-task-figma-select map-task-figma-input-has-trailing">
                  <select
                    className="map-task-figma-control map-task-figma-select-control"
                    disabled={!zoneId || zoneAreaOptions.length === 0}
                    onChange={(event) => setAreaId(event.target.value || null)}
                    value={selectedArea?.areaId ?? areaId ?? ''}
                  >
                    <option value="">
                      {!zoneId
                        ? 'Select a zone first'
                        : areaCatalogPending
                          ? 'Loading areas...'
                          : 'Select an area'}
                    </option>
                    {zoneAreaOptions.map((option) => (
                      <option key={option.areaId} value={option.areaId}>
                        {option.displayLabel}
                      </option>
                    ))}
                  </select>
                  <TaskChevronDownIcon className="map-task-figma-inline-icon map-task-figma-chevron" />
                </div>
              </div>
              <small className="map-task-figma-field-help">
                {selectedArea
                  ? `Selected area: ${selectedArea.zoneName} / ${selectedArea.submitLabel}`
                  : areaCatalogPending
                    ? 'Loading live Bakki Core zones and areas.'
                    : zoneOptions.length === 0
                      ? 'No areas are available for task assignment.'
                      : !zoneId
                        ? 'Select a zone to load its mapped areas.'
                        : zoneAreaOptions.length === 0
                          ? 'No mapped areas are available in the selected zone.'
                          : 'Select one mapped area in the selected zone.'}
              </small>
            </label>
            <label className="map-task-figma-field">
              <span>Personnel</span>
              <div className="map-task-figma-field-stack">
                <div className="map-task-figma-input map-task-figma-placeholder">
                  <TaskPersonnelIcon className="map-task-figma-inline-icon" />
                  <input
                    className="map-task-figma-control map-task-figma-control-placeholder"
                    onChange={(event) => setPersonnelQuery(event.target.value)}
                    placeholder="Search team..."
                    type="text"
                    value={personnelQuery}
                  />
                </div>
                <div className="map-task-figma-input map-task-figma-select map-task-figma-input-has-trailing">
                  <select
                    className="map-task-figma-control map-task-figma-select-control"
                    disabled={planterDirectoryPending || visiblePlanterOptions.length === 0}
                    onChange={(event) => setSelectedPlanterId(event.target.value || null)}
                    value={selectedPlanterId ?? ''}
                  >
                    <option value="">
                      {planterDirectoryPending ? 'Loading planters...' : 'Select a planter'}
                    </option>
                    {visiblePlanterOptions.map((planter) => (
                      <option key={planter.id} value={planter.id}>
                        {planter.fullName}
                      </option>
                    ))}
                  </select>
                  <TaskChevronDownIcon className="map-task-figma-inline-icon map-task-figma-chevron" />
                </div>
              </div>
              <small className="map-task-figma-field-help">
                {planterDirectoryPending
                  ? 'Loading active planters.'
                  : selectedPlanter
                    ? `Selected planter: ${selectedPlanter.fullName}`
                    : deferredPersonnelQuery && visiblePlanterOptions.length === 0
                      ? 'No active planters match the current search.'
                  : planterOptions.length > 0
                    ? `${planterOptions.length} active planter${planterOptions.length === 1 ? '' : 's'} available.`
                    : 'No active planters are available right now.'}
              </small>
            </label>
          </div>

          <div className="map-task-figma-grid">
            <label className="map-task-figma-field">
              <span>Completion Deadline</span>
              <div className="map-task-figma-input map-task-figma-date">
                <TaskCalendarIcon className="map-task-figma-inline-icon" />
                <input
                  className="map-task-figma-control"
                  onChange={(event) => setDueDate(event.target.value)}
                  type="date"
                  value={dueDate}
                />
              </div>
            </label>
            <label className="map-task-figma-field">
              <span>Priority</span>
              <div className="map-task-figma-input map-task-figma-select map-task-figma-input-has-trailing">
                <select
                  className="map-task-figma-control map-task-figma-select-control"
                  onChange={(event) => setPriority(normalizeTaskPriorityValue(event.target.value))}
                  value={priority}
                >
                  {TASK_PRIORITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <TaskChevronDownIcon className="map-task-figma-inline-icon map-task-figma-chevron" />
              </div>
            </label>
          </div>

          <label className="map-task-figma-field">
            <span>Task Description &amp; Goal</span>
            <textarea
              className="map-task-figma-textarea map-task-figma-control"
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Detail the specific planting requirements or monitoring metrics..."
              value={description}
            />
          </label>
        </div>

        <footer className="map-task-figma-footer" data-node-id="58:1496">
          <button className="map-task-figma-draft" type="button">
            <TaskDraftIcon className="map-task-figma-inline-icon" />
            <span>Save as Draft</span>
          </button>
          <div className="map-task-figma-actions">
            <button className="map-task-figma-cancel" onClick={close} type="button">Cancel</button>
            <button
              className="map-task-figma-deploy"
              disabled={!canSubmit}
              onClick={() => void submit()}
              type="button"
            >
              <TaskDeployIcon className="map-task-figma-inline-icon" />
              <span>{isPending ? 'Deploying...' : 'Deploy Task'}</span>
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
