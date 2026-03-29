import type {
  SpeciesInventoryDetail,
  SpeciesRecord,
} from '@bakki/domain';
import { localAssetUrls } from '@bakki/domain';
import {
  ActionButton,
  EmptyStatePanel,
  InlineStatusBanner,
  SplitDetailLayout,
  SurfaceCard,
} from '@bakki/ui';

export function SpeciesInventoryWorkspace({
  rows,
  selectedSpecies,
  speciesDetail,
  speciesDetailError,
  isSpeciesDetailPending,
  speciesDetailOpen,
  onCloseDetail,
  onOpenAddStockModal,
  onOpenCreateModal,
  onOpenDetail,
  onOpenEditModal,
  onOpenUpdateStockModal,
  onRefetchSpeciesDetail,
}: {
  rows: SpeciesRecord[];
  selectedSpecies: SpeciesRecord | null;
  speciesDetail?: SpeciesInventoryDetail;
  speciesDetailError: unknown;
  isSpeciesDetailPending: boolean;
  speciesDetailOpen: boolean;
  onCloseDetail: () => void;
  onOpenAddStockModal: () => void;
  onOpenCreateModal: () => void;
  onOpenDetail: (speciesId: string) => void;
  onOpenEditModal: () => void;
  onOpenUpdateStockModal: () => void;
  onRefetchSpeciesDetail: () => void;
}) {
  return (
    <SplitDetailLayout
      className="species-figma-shell"
      detail={
        <SurfaceCard as="article" className="species-figma-detail-card">
          <div className="species-figma-detail-hero">
            <img
              src={speciesDetail?.heroImageUrl || selectedSpecies?.thumbnailUrl || localAssetUrls.speciesHero}
              alt=""
            />
            <span>{speciesDetail?.heroTag || selectedSpecies?.areaType || 'Species Record'}</span>
            <button
              aria-label="Close species detail"
              className="species-figma-detail-close"
              onClick={onCloseDetail}
              type="button"
            >
              <img src={localAssetUrls.close} alt="" />
            </button>
          </div>

          <div className="species-figma-detail-body">
            {speciesDetailError ? (
              <InlineStatusBanner
                action={{ label: 'Retry', onAction: () => void onRefetchSpeciesDetail() }}
                className="bakki-card-inline-state"
                heading="Species detail unavailable"
                message={
                  speciesDetailError instanceof Error
                    ? speciesDetailError.message
                    : 'The selected species detail could not be loaded.'
                }
                tone="error"
              />
            ) : null}
            {isSpeciesDetailPending && !speciesDetail ? (
              <InlineStatusBanner
                className="bakki-card-inline-state"
                heading="Loading species detail"
                message="Loading inventory metadata for the selected species."
                tone="neutral"
              />
            ) : null}
            <div className="species-figma-detail-title">
              <h2>{speciesDetail?.name || selectedSpecies?.commonName || 'Species detail'}</h2>
              <p>{speciesDetail?.botanicalName || selectedSpecies?.botanicalName || ''}</p>
            </div>

            <div className="species-figma-detail-metrics">
              {buildSpeciesDetailMetrics(speciesDetail, selectedSpecies).map((metric) => (
                <div className="species-figma-detail-metric" key={metric.label}>
                  <small>{metric.label}</small>
                  <strong>{metric.value}</strong>
                  <span><img src={metric.metaIconUrl} alt="" />{metric.metaText}</span>
                </div>
              ))}
            </div>

            <div className="species-figma-detail-notes">
              <small>Notes</small>
              <p>{speciesDetail?.notes || 'No species notes have been recorded yet.'}</p>
            </div>

            <div className="species-figma-detail-actions">
              <ActionButton
                className="species-figma-detail-button species-figma-detail-button-secondary"
                label="Add Stock"
                labelClassName=""
                leadingVisual={<img src={localAssetUrls.addSpecies} alt="" />}
                onClick={onOpenAddStockModal}
              />
              <ActionButton
                className="species-figma-detail-button species-figma-detail-button-secondary"
                label="Update Stock"
                labelClassName=""
                leadingVisual={<img src={localAssetUrls.updateStock} alt="" />}
                onClick={onOpenUpdateStockModal}
              />
            </div>

            <ActionButton
              className="species-figma-detail-button"
              label={speciesDetail?.actionLabel || 'Edit Species Parameters'}
              labelClassName=""
              leadingVisual={<img src={speciesDetail?.actionIconUrl || localAssetUrls.editSpecies} alt="" />}
              onClick={onOpenEditModal}
            />
          </div>
        </SurfaceCard>
      }
      detailClassName="species-figma-detail-panel"
      detailOpen={speciesDetailOpen}
      main={
        <>
          <header className="species-figma-header">
            <div className="species-figma-title-wrap">
              <h1 className="species-figma-title">
                <span className="species-figma-title-default">Inventory</span>
                <span className="species-figma-title-open">Inventory</span>
              </h1>
            </div>

            <div className="species-figma-actions">
              <ActionButton
                className="species-figma-action species-figma-action-primary"
                label={
                  <>
                    <span className="species-figma-action-default">Add New</span>
                    <span className="species-figma-action-open">Add<br />New</span>
                  </>
                }
                leadingVisual={<img src={localAssetUrls.addSpecies} alt="" />}
                onClick={onOpenCreateModal}
              />
            </div>
          </header>

          <SurfaceCard as="section" className="species-figma-table-card">
            <div className="species-figma-table-head">
              <div className="species-figma-col species-figma-col-species">Species</div>
              <div className="species-figma-col species-figma-col-inventory">Inventory</div>
              <div className="species-figma-col species-figma-col-planted">
                <span className="species-figma-col-default">Total Planted</span>
                <span className="species-figma-col-open">Total<br />Planted</span>
              </div>
              <div className="species-figma-col species-figma-col-growth">
                <span className="species-figma-col-default">Growth Phase</span>
                <span className="species-figma-col-open">Growth<br />Phase</span>
              </div>
            </div>

            <div className="species-figma-table-body">
              {rows.length > 0 ? (
                rows.map((species) => (
                  <SpeciesRow
                    key={species.id}
                    onOpenDetail={onOpenDetail}
                    open={speciesDetailOpen && selectedSpecies?.id === species.id}
                    selected={selectedSpecies?.id === species.id}
                    species={species}
                  />
                ))
              ) : (
                <EmptyStatePanel
                  className="bakki-card-empty-state"
                  heading="No species available"
                  message="Add species records to begin tracking stock and planting coverage."
                />
              )}
            </div>
          </SurfaceCard>

        </>
      }
      mainClassName="species-figma-main"
      openClassName="species-detail-open"
    />
  );
}

function buildSpeciesDetailMetrics(
  speciesDetail: SpeciesInventoryDetail | undefined,
  selectedSpecies: SpeciesRecord | null,
) {
  if (speciesDetail) {
    return speciesDetail.metrics;
  }

  if (!selectedSpecies) {
    return [];
  }

  return [
    {
      label: 'Stock on Hand',
      value: selectedSpecies.inventoryUnits,
      metaIconUrl: localAssetUrls.verified,
      metaText: 'Live inventory',
    },
    {
      label: 'Total Planted',
      value: selectedSpecies.totalPlanted,
      metaIconUrl: localAssetUrls.trend,
      metaText: selectedSpecies.growthPhase,
    },
  ];
}

function SpeciesRow({
  species,
  open,
  selected,
  onOpenDetail,
}: {
  species: SpeciesRecord;
  open: boolean;
  selected: boolean;
  onOpenDetail: (speciesId: string) => void;
}) {
  const rowVariantClassName = species.thumbnailClassName.replace('species-figma-thumb-', 'species-figma-row-');
  const className = [
    'species-figma-row',
    'species-figma-row-clickable',
    selected ? 'species-figma-row-selected' : '',
    rowVariantClassName,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={className}
      data-open-species-detail
      aria-expanded={open}
      onClick={() => onOpenDetail(species.id)}
      type="button"
    >
      <div className="species-figma-cell species-figma-cell-species">
        <div className={`species-figma-thumb ${species.thumbnailClassName}`}>
          <img src={species.thumbnailUrl} alt="" />
        </div>
        <div className="species-figma-species-copy">
          <strong>
            <span className="species-figma-name-default">{species.commonName}</span>
            <span className="species-figma-name-open">{splitSpeciesName(species.commonName)}</span>
          </strong>
          <span>
            <span className="species-figma-latin-default">{species.botanicalName}</span>
            <span className="species-figma-latin-open">{splitSpeciesName(species.botanicalName)}</span>
          </span>
        </div>
      </div>
      <div className="species-figma-cell species-figma-cell-mono"><strong>{species.inventoryUnits}</strong><span>units</span></div>
      <div className="species-figma-cell">{species.totalPlanted}</div>
      <div className="species-figma-cell">
        <span className={`species-figma-tag species-figma-tag-${species.growthTone}`}>{species.growthPhase}</span>
      </div>
    </button>
  );
}

function splitSpeciesName(value: string) {
  const parts = value.split(' ');
  if (parts.length === 1) {
    return value;
  }
  return (
    <>
      {parts.slice(0, -1).join(' ')}
      <br />
      {parts.at(-1)}
    </>
  );
}
