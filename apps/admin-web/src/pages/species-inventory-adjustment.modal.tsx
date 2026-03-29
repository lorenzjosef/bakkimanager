import type { InventoryAdjustmentReason } from '@bakki/domain';
import { localAssetUrls } from '@bakki/domain';
import { InlineStatusBanner } from '@bakki/ui';
import {
  canSubmitInventoryAdjustment,
  type SpeciesInventoryAdjustmentMode,
} from './species-inventory.utils';

export function SpeciesInventoryAdjustmentModal({
  adjustmentMode,
  adjustmentNote,
  adjustmentReason,
  currentInventoryUnits,
  errorMessage,
  isPending,
  onChangeNote,
  onChangeReason,
  onChangeTargetStock,
  onChangeTrayCount,
  onChangeTrayMultiple,
  onClose,
  onSubmit,
  projectedInventoryUnits,
  resolvedQuantityDelta,
  speciesName,
  successMessage,
  targetStock,
  trayCount,
  trayMultiple,
}: {
  adjustmentMode: SpeciesInventoryAdjustmentMode;
  adjustmentNote: string;
  adjustmentReason: InventoryAdjustmentReason;
  currentInventoryUnits: string;
  errorMessage: string | null;
  isPending: boolean;
  onChangeNote: (value: string) => void;
  onChangeReason: (value: InventoryAdjustmentReason) => void;
  onChangeTargetStock: (value: string) => void;
  onChangeTrayCount: (value: string) => void;
  onChangeTrayMultiple: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  projectedInventoryUnits: number | null;
  resolvedQuantityDelta: number | null;
  speciesName: string;
  successMessage: string | null;
  targetStock: string;
  trayCount: string;
  trayMultiple: string;
}) {
  const isAddMode = adjustmentMode === 'add';
  const canSubmit = canSubmitInventoryAdjustment(
    resolvedQuantityDelta,
    projectedInventoryUnits,
    isPending,
  );
  const projectedValue = (
    projectedInventoryUnits === null
      ? currentInventoryUnits
      : Math.round(projectedInventoryUnits).toLocaleString('en-US')
  );
  const deltaValue = (
    resolvedQuantityDelta === null
      ? 'Pending calculation'
      : `${resolvedQuantityDelta > 0 ? '+' : ''}${Math.round(resolvedQuantityDelta).toLocaleString('en-US')}`
  );

  return (
    <div className="bakki-modal-shell" role="presentation">
      <div className="bakki-modal-backdrop" onClick={onClose} />
      <section
        aria-labelledby="species-inventory-adjustment-title"
        aria-modal="true"
        className="bakki-modal-card task-monitoring-modal species-inventory-adjustment-modal"
        role="dialog"
      >
        <div className="task-monitoring-modal-body">
          <div className="task-monitoring-modal-head">
            <div>
              <span className="task-monitoring-modal-eyebrow">Inventory Adjustment</span>
              <h2 id="species-inventory-adjustment-title">
                {isAddMode ? 'Add Stock' : 'Update Stock'}
              </h2>
              <p>{speciesName}</p>
            </div>
            <button className="task-monitoring-modal-close" onClick={onClose} type="button">
              <img src={localAssetUrls.close} alt="" />
            </button>
          </div>

          {errorMessage ? (
            <InlineStatusBanner
              heading="Inventory update failed"
              message={errorMessage}
              tone="error"
            />
          ) : null}

          {successMessage ? (
            <InlineStatusBanner
              heading="Latest adjustment recorded"
              message={successMessage}
              tone="neutral"
            />
          ) : null}

          <p className="task-monitoring-modal-copy">
            {isAddMode
              ? 'Bakki calculates the intake as tray count multiplied by the number of trees in each tray.'
              : 'Set the corrected stock count and Bakki will calculate the inventory adjustment automatically.'}
          </p>

          <div className="task-monitoring-modal-grid">
            <label className="task-monitoring-modal-field">
              <span>Current Stock</span>
              <input className="task-monitoring-modal-input" readOnly type="text" value={currentInventoryUnits} />
            </label>

            <label className="task-monitoring-modal-field">
              <span>Projected Stock</span>
              <input
                className="task-monitoring-modal-input"
                readOnly
                type="text"
                value={projectedValue}
              />
            </label>
          </div>

          {isAddMode ? (
            <div className="task-monitoring-modal-grid">
              <label className="task-monitoring-modal-field">
                <span>Number of Trays</span>
                <input
                  className="task-monitoring-modal-input"
                  inputMode="numeric"
                  min="0"
                  onChange={(event) => onChangeTrayCount(event.target.value)}
                  step="1"
                  type="number"
                  value={trayCount}
                />
              </label>

              <label className="task-monitoring-modal-field">
                <span>Trees per Tray</span>
                <input
                  className="task-monitoring-modal-input"
                  inputMode="numeric"
                  min="0"
                  onChange={(event) => onChangeTrayMultiple(event.target.value)}
                  step="1"
                  type="number"
                  value={trayMultiple}
                />
              </label>
            </div>
          ) : (
            <div className="task-monitoring-modal-grid">
              <label className="task-monitoring-modal-field">
                <span>Corrected Stock Count</span>
                <input
                  className="task-monitoring-modal-input"
                  inputMode="numeric"
                  min="0"
                  onChange={(event) => onChangeTargetStock(event.target.value)}
                  step="1"
                  type="number"
                  value={targetStock}
                />
              </label>

              <label className="task-monitoring-modal-field">
                <span>Calculated Adjustment</span>
                <input
                  className="task-monitoring-modal-input"
                  readOnly
                  type="text"
                  value={deltaValue}
                />
              </label>
            </div>
          )}

          {isAddMode ? (
            <div className="task-monitoring-modal-grid">
              <label className="task-monitoring-modal-field">
                <span>Calculated Trees Added</span>
                <input
                  className="task-monitoring-modal-input"
                  readOnly
                  type="text"
                  value={deltaValue}
                />
              </label>

              <label className="task-monitoring-modal-field">
                <span>Reason</span>
                <select
                  className="task-monitoring-modal-input species-inventory-adjustment-select"
                  onChange={(event) => onChangeReason(event.target.value as InventoryAdjustmentReason)}
                  value={adjustmentReason}
                >
                  <option value="adjustment">Adjustment</option>
                  <option value="correction">Correction</option>
                  <option value="planting">Planting</option>
                  <option value="monitoring">Monitoring</option>
                  <option value="fertilizing">Fertilizing</option>
                </select>
              </label>
            </div>
          ) : (
            <label className="task-monitoring-modal-field">
              <span>Reason</span>
              <select
                className="task-monitoring-modal-input species-inventory-adjustment-select"
                onChange={(event) => onChangeReason(event.target.value as InventoryAdjustmentReason)}
                value={adjustmentReason}
              >
                <option value="adjustment">Adjustment</option>
                <option value="correction">Correction</option>
                <option value="planting">Planting</option>
                <option value="monitoring">Monitoring</option>
                <option value="fertilizing">Fertilizing</option>
              </select>
            </label>
          )}

          <label className="task-monitoring-modal-field">
            <span>Adjustment Notes</span>
            <textarea
              className="task-monitoring-modal-textarea"
              onChange={(event) => onChangeNote(event.target.value)}
              placeholder="Record why the stock changed and what happened in the field or nursery."
              value={adjustmentNote}
            />
          </label>

          <div className="task-monitoring-modal-actions">
            <button className="task-monitoring-modal-secondary" onClick={onClose} type="button">
              Cancel
            </button>
            <button
              className="task-monitoring-modal-primary"
              disabled={!canSubmit}
              onClick={onSubmit}
              type="button"
            >
              {isPending ? 'Saving...' : isAddMode ? 'Add Stock' : 'Save Stock Update'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
