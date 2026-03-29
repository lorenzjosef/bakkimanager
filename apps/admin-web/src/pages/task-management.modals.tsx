import { useEffect, useMemo, useRef, useState } from 'react';
import type { TaskTableRow } from '@bakki/domain';
import { localAssetUrls } from '@bakki/domain';
import { InlineStatusBanner } from '@bakki/ui';
import {
  useRecordMonitoringResultMutation,
  useUpdateTaskWorkflowMutation,
} from '@/queries/tasks';
import {
  buildMonitoringResultPayload,
  buildMonitoringSuccessMessage,
  canSubmitMonitoringResult,
} from './task-management.modal-utils';
import {
  getNextWorkflowState,
  humanizeWorkflowAction,
  humanizeWorkflowState,
} from './task-management.utils';

export function MonitoringResultModal({
  isOpen,
  onClose,
  row,
}: {
  isOpen: boolean;
  onClose: () => void;
  row: TaskTableRow | null;
}) {
  const monitoringMutation = useRecordMonitoringResultMutation();
  const { mutateAsync, reset } = monitoringMutation;
  const [densityPer100Sqm, setDensityPer100Sqm] = useState('');
  const [treeCount, setTreeCount] = useState('');
  const [observedAt, setObservedAt] = useState('');
  const [notes, setNotes] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen || !row) {
      return;
    }

    setDensityPer100Sqm('');
    setTreeCount('');
    setObservedAt(new Date().toISOString().slice(0, 10));
    setNotes('');
    setSuccessMessage(null);
    reset();
  }, [isOpen, reset, row]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const canSubmit = useMemo(() => {
    return canSubmitMonitoringResult(densityPer100Sqm, monitoringMutation.isPending);
  }, [densityPer100Sqm, monitoringMutation.isPending]);

  if (!isOpen || !row) {
    return null;
  }

  const submit = async () => {
    const payload = buildMonitoringResultPayload(densityPer100Sqm, treeCount, observedAt, notes);

    const result = await mutateAsync({
      taskId: row.id,
      payload,
    });

    setSuccessMessage(buildMonitoringSuccessMessage(row.titleLabel, result.densityPer100Sqm));
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = window.setTimeout(() => {
      onClose();
    }, 650);
  };

  return (
    <div className="bakki-modal-shell">
      <div className="bakki-modal-backdrop" onClick={onClose} />
      <section
        aria-labelledby="monitoring-result-title"
        aria-modal="true"
        className="bakki-modal-card task-monitoring-modal"
        role="dialog"
      >
        <div className="task-monitoring-modal-body">
          <div className="task-monitoring-modal-head">
            <div>
              <span className="task-monitoring-modal-eyebrow">Monitoring Result</span>
              <h2 id="monitoring-result-title">{row.titleLabel}</h2>
              <p>{row.sectorSubtitle ? `${row.sectorTitle} • ${row.sectorSubtitle}` : row.sectorTitle}</p>
            </div>
            <button className="task-monitoring-modal-close" onClick={onClose} type="button">
              <img src={localAssetUrls.close} alt="" />
            </button>
          </div>

          {monitoringMutation.isError ? (
            <InlineStatusBanner
              heading="Monitoring update failed"
              message={
                monitoringMutation.error instanceof Error
                  ? monitoringMutation.error.message
                  : 'The monitoring result could not be recorded.'
              }
              tone="error"
            />
          ) : null}

          {successMessage ? (
            <InlineStatusBanner
              heading="Monitoring result recorded"
              message={successMessage}
              tone="neutral"
            />
          ) : null}

          <div className="task-monitoring-modal-grid">
            <label className="task-monitoring-modal-field">
              <span>New Density / 100m²</span>
              <input
                className="task-monitoring-modal-input"
                inputMode="decimal"
                min="0.01"
                onChange={(event) => setDensityPer100Sqm(event.target.value)}
                step="0.1"
                type="number"
                value={densityPer100Sqm}
              />
            </label>

            <label className="task-monitoring-modal-field">
              <span>Tree Count</span>
              <input
                className="task-monitoring-modal-input"
                inputMode="numeric"
                min="0"
                onChange={(event) => setTreeCount(event.target.value)}
                step="1"
                type="number"
                value={treeCount}
              />
            </label>
          </div>

          <label className="task-monitoring-modal-field">
            <span>Observed On</span>
            <input
              className="task-monitoring-modal-input"
              onChange={(event) => setObservedAt(event.target.value)}
              type="date"
              value={observedAt}
            />
          </label>

          <label className="task-monitoring-modal-field">
            <span>Field Notes</span>
            <textarea
              className="task-monitoring-modal-textarea"
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Record what changed on the area and why the density has been updated..."
              value={notes}
            />
          </label>

          <div className="task-monitoring-modal-actions">
            <button className="task-monitoring-modal-secondary" onClick={onClose} type="button">
              Cancel
            </button>
            <button
              className="task-monitoring-modal-primary"
              disabled={!canSubmit}
              onClick={() => void submit()}
              type="button"
            >
              {monitoringMutation.isPending ? 'Saving...' : 'Save Monitoring Result'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export function WorkflowUpdateModal({
  isOpen,
  onClose,
  row,
}: {
  isOpen: boolean;
  onClose: () => void;
  row: TaskTableRow | null;
}) {
  const workflowMutation = useUpdateTaskWorkflowMutation();
  const [selectedWorkflowState, setSelectedWorkflowState] = useState<NonNullable<TaskTableRow['workflowState']>>('pending');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen || !row) {
      return;
    }

    setSuccessMessage(null);
    setSelectedWorkflowState(getNextWorkflowState(row.workflowState ?? 'pending'));
    workflowMutation.reset();
  }, [isOpen, row, workflowMutation]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  if (!isOpen || !row) {
    return null;
  }

  const submit = async () => {
    const result = await workflowMutation.mutateAsync({
      taskId: row.id,
      payload: { workflowState: selectedWorkflowState },
    });

    setSuccessMessage(`${row.titleLabel} is now ${result.stageLabel ?? humanizeWorkflowState(result.workflowState)}.`);
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = window.setTimeout(() => {
      onClose();
    }, 650);
  };

  return (
    <div className="bakki-modal-shell">
      <div className="bakki-modal-backdrop" onClick={onClose} />
      <section
        aria-labelledby="workflow-update-title"
        aria-modal="true"
        className="bakki-modal-card task-monitoring-modal"
        role="dialog"
      >
        <div className="task-monitoring-modal-body">
          <div className="task-monitoring-modal-head">
            <div>
              <span className="task-monitoring-modal-eyebrow">Task Workflow</span>
              <h2 id="workflow-update-title">{row.titleLabel}</h2>
              <p>{row.sectorSubtitle ? `${row.sectorTitle} • ${row.sectorSubtitle}` : row.sectorTitle}</p>
            </div>
            <button className="task-monitoring-modal-close" onClick={onClose} type="button">
              <img src={localAssetUrls.close} alt="" />
            </button>
          </div>

          {workflowMutation.isError ? (
            <InlineStatusBanner
              heading="Workflow update failed"
              message={
                workflowMutation.error instanceof Error
                  ? workflowMutation.error.message
                  : 'The task workflow could not be updated.'
              }
              tone="error"
            />
          ) : null}

          {successMessage ? (
            <InlineStatusBanner
              heading="Workflow updated"
              message={successMessage}
              tone="neutral"
            />
          ) : null}

          <div className="task-monitoring-modal-grid">
            <label className="task-monitoring-modal-field">
              <span>Current Workflow</span>
              <input
                className="task-monitoring-modal-input"
                readOnly
                type="text"
                value={row.stageLabel ?? humanizeWorkflowState(row.workflowState ?? 'pending')}
              />
            </label>
            <label className="task-monitoring-modal-field">
              <span>Next Workflow</span>
              <select
                className="task-monitoring-modal-input"
                onChange={(event) => setSelectedWorkflowState(event.target.value as NonNullable<TaskTableRow['workflowState']>)}
                value={selectedWorkflowState}
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
          </div>

          <p className="task-monitoring-modal-copy">
            This changes the Odoo task stage and the mirrored Bakki workflow state used by the dashboard, task log, and reporting summaries.
          </p>

          <div className="task-monitoring-modal-actions">
            <button className="task-monitoring-modal-secondary" onClick={onClose} type="button">
              Cancel
            </button>
            <button
              className="task-monitoring-modal-primary"
              disabled={workflowMutation.isPending}
              onClick={() => void submit()}
              type="button"
            >
              {workflowMutation.isPending ? 'Saving...' : humanizeWorkflowAction(selectedWorkflowState)}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
