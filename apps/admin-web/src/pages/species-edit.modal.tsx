import { localAssetUrls } from '@bakki/domain';
import { InlineStatusBanner } from '@bakki/ui';
import { canSubmitUpdateSpecies } from './species-inventory.utils';

export function EditSpeciesModal({
  areaType,
  botanicalName,
  commonName,
  errorMessage,
  growthPhase,
  inventoryUnit,
  isPending,
  notes,
  treesPerTray,
  onChangeAreaType,
  onChangeBotanicalName,
  onChangeCommonName,
  onChangeGrowthPhase,
  onChangeInventoryUnit,
  onChangeNotes,
  onChangeTreesPerTray,
  onClose,
  onSubmit,
  speciesCode,
}: {
  areaType: string;
  botanicalName: string;
  commonName: string;
  errorMessage: string | null;
  growthPhase: string;
  inventoryUnit: string;
  isPending: boolean;
  notes: string;
  treesPerTray: string;
  onChangeAreaType: (value: string) => void;
  onChangeBotanicalName: (value: string) => void;
  onChangeCommonName: (value: string) => void;
  onChangeGrowthPhase: (value: string) => void;
  onChangeInventoryUnit: (value: string) => void;
  onChangeNotes: (value: string) => void;
  onChangeTreesPerTray: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  speciesCode: string;
}) {
  const canSubmit = canSubmitUpdateSpecies(
    commonName,
    botanicalName,
    inventoryUnit,
    treesPerTray,
    isPending,
  );

  return (
    <div className="bakki-modal-shell" role="presentation">
      <div className="bakki-modal-backdrop" onClick={onClose} />
      <section
        aria-labelledby="edit-species-title"
        aria-modal="true"
        className="bakki-modal-card task-monitoring-modal species-create-modal"
        role="dialog"
      >
        <div className="task-monitoring-modal-body">
          <div className="task-monitoring-modal-head">
            <div>
              <span className="task-monitoring-modal-eyebrow">Species Parameters</span>
              <h2 id="edit-species-title">Edit Species Parameters</h2>
              <p>{speciesCode}</p>
            </div>
            <button className="task-monitoring-modal-close" onClick={onClose} type="button">
              <img src={localAssetUrls.close} alt="" />
            </button>
          </div>

          {errorMessage ? (
            <InlineStatusBanner
              heading="Species update failed"
              message={errorMessage}
              tone="error"
            />
          ) : null}

          <div className="task-monitoring-modal-grid">
            <label className="task-monitoring-modal-field">
              <span>Common Name</span>
              <input className="task-monitoring-modal-input" onChange={(event) => onChangeCommonName(event.target.value)} type="text" value={commonName} />
            </label>
            <label className="task-monitoring-modal-field">
              <span>Botanical Name</span>
              <input className="task-monitoring-modal-input" onChange={(event) => onChangeBotanicalName(event.target.value)} type="text" value={botanicalName} />
            </label>
          </div>

          <div className="task-monitoring-modal-grid">
            <label className="task-monitoring-modal-field">
              <span>Inventory Unit</span>
              <input className="task-monitoring-modal-input" onChange={(event) => onChangeInventoryUnit(event.target.value)} type="text" value={inventoryUnit} />
            </label>
            <label className="task-monitoring-modal-field">
              <span>Trees Per Tray</span>
              <input className="task-monitoring-modal-input" inputMode="numeric" min="1" onChange={(event) => onChangeTreesPerTray(event.target.value)} step="1" type="number" value={treesPerTray} />
            </label>
          </div>

          <div className="task-monitoring-modal-grid">
            <label className="task-monitoring-modal-field">
              <span>Growth Phase</span>
              <input className="task-monitoring-modal-input" onChange={(event) => onChangeGrowthPhase(event.target.value)} placeholder="Seedling, Sapling, Juvenile..." type="text" value={growthPhase} />
            </label>
          </div>

          <label className="task-monitoring-modal-field">
            <span>Area Type</span>
            <input className="task-monitoring-modal-input" onChange={(event) => onChangeAreaType(event.target.value)} placeholder="Wetlands, Basalt Slopes, Lowland Plains..." type="text" value={areaType} />
          </label>

          <label className="task-monitoring-modal-field">
            <span>Notes</span>
            <textarea
              className="task-monitoring-modal-textarea"
              onChange={(event) => onChangeNotes(event.target.value)}
              placeholder="Record origin, nursery notes, or planting constraints for this species."
              value={notes}
            />
          </label>

          <div className="task-monitoring-modal-actions">
            <button className="task-monitoring-modal-secondary" onClick={onClose} type="button">
              Cancel
            </button>
            <button className="task-monitoring-modal-primary" disabled={!canSubmit} onClick={onSubmit} type="button">
              {isPending ? 'Saving...' : 'Save Species Changes'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
