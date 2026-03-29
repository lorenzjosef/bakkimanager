import { useState } from 'react';
import type { ZoneContractSummary } from '@bakki/domain';
import { ButtonSurface, EmptyStatePanel, PageStatePanel, SurfaceCard } from '@bakki/ui';
import { useContractsSummaryData } from '@/queries/contracts';

function formatTreeCount(value: number) {
  return value.toLocaleString('en-US');
}

function formatFulfillment(value: number | null) {
  return value === null ? 'Unavailable' : `${value}%`;
}

function buildZoneBalanceCopy(zone: ZoneContractSummary) {
  if (zone.goalTreeCount <= 0) {
    return 'No zone contract goal recorded yet.';
  }

  const delta = zone.plantedTreeCount - zone.goalTreeCount;
  if (delta === 0) {
    return 'Exactly on contract.';
  }

  return delta > 0
    ? `Over by ${formatTreeCount(delta)} trees.`
    : `${formatTreeCount(Math.abs(delta))} trees remaining.`;
}

export function ContractsPage() {
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const {
    data,
    isPending,
    refetch,
  } = useContractsSummaryData();

  if (isPending && !data) {
    return (
      <section className="view is-active" id="view-contracts">
        <div className="page-content contracts-page">
          <PageStatePanel
            eyebrow="Contracts"
            heading="Loading contract summary"
            message="Loading global and zone-level contract fulfilment."
          />
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="view is-active" id="view-contracts">
        <div className="page-content contracts-page">
          <PageStatePanel
            action={{ label: 'Retry', onAction: () => void refetch() }}
            eyebrow="Contracts"
            heading="Contracts unavailable"
            message="The ranch contract summary could not be loaded."
            tone="error"
          />
        </div>
      </section>
    );
  }

  const selectedZone = data.zones.find((zone) => zone.zoneId === selectedZoneId) ?? data.zones[0] ?? null;

  return (
    <section className="view is-active" id="view-contracts">
      <div className="page-content contracts-page">
        <header className="contracts-page-header">
          <div>
            <span className="contracts-page-eyebrow">Ranch Contracts</span>
            <h1>Contracts</h1>
            <p>
              Over-fulfilled zones can compensate under-fulfilled zones at ranch level. Area tree counts roll up into
              their zone totals, and zone totals roll up into the global ranch contract.
            </p>
          </div>
        </header>

        <SurfaceCard as="section" className="contracts-global-card">
          <div className="contracts-global-copy">
            <span className="contracts-card-eyebrow">Global Contract</span>
            <h2>{formatFulfillment(data.globalFulfillmentPercent)}</h2>
            <p>
              {formatTreeCount(data.globalPlantedTreeCount)} of {formatTreeCount(data.globalGoalTreeCount)} trees
              planted across the ranch.
            </p>
          </div>
          <div className="contracts-global-metrics">
            <div className="contracts-metric-card">
              <span>Global Goal</span>
              <strong>{formatTreeCount(data.globalGoalTreeCount)}</strong>
              <small>trees</small>
            </div>
            <div className="contracts-metric-card">
              <span>Planted Total</span>
              <strong>{formatTreeCount(data.globalPlantedTreeCount)}</strong>
              <small>trees</small>
            </div>
            <div className="contracts-metric-card">
              <span>Tracked Zones</span>
              <strong>{formatTreeCount(data.zones.length)}</strong>
              <small>zones</small>
            </div>
          </div>
        </SurfaceCard>

        <div className="contracts-zone-list">
          {data.zones.length > 0 ? (
            <div className="contracts-zone-layout">
              <section className="contracts-zone-panel">
                <div className="contracts-zone-list-head">
                  <div>
                    <span className="contracts-card-eyebrow">Zone Contracts</span>
                    <h2>{formatTreeCount(data.zones.length)} Zones</h2>
                  </div>
                  <p>Select a zone card to inspect the areas that make up its planted tree count.</p>
                </div>

                <div className="contracts-zone-grid">
                  {data.zones.map((zone) => {
                    const isSelected = zone.zoneId === selectedZone?.zoneId;

                    return (
                      <ButtonSurface
                        aria-pressed={isSelected}
                        className={`contracts-zone-card${isSelected ? ' is-selected' : ''}`}
                        key={zone.zoneId}
                        onClick={() => setSelectedZoneId(zone.zoneId)}
                      >
                        <div className="contracts-zone-card-head">
                          <span className="contracts-card-eyebrow">Zone</span>
                          <span className="contracts-zone-progress">{formatFulfillment(zone.fulfillmentPercent)}</span>
                        </div>
                        <h3>{zone.zoneName}</h3>
                        <div className="contracts-zone-statline">
                          <strong>{formatTreeCount(zone.plantedTreeCount)}</strong>
                          <span>planted</span>
                        </div>
                        <div className="contracts-zone-inline-metrics">
                          <span>{formatTreeCount(zone.goalTreeCount)} goal</span>
                          <span>{formatTreeCount(zone.areaCount)} areas</span>
                        </div>
                        <p>{buildZoneBalanceCopy(zone)}</p>
                      </ButtonSurface>
                    );
                  })}
                </div>
              </section>

              {selectedZone ? (
                <SurfaceCard as="aside" className="contracts-zone-detail">
                  <div className="contracts-zone-detail-head">
                    <div>
                      <span className="contracts-card-eyebrow">Selected Zone</span>
                      <h2>{selectedZone.zoneName}</h2>
                      <p>{buildZoneBalanceCopy(selectedZone)}</p>
                    </div>
                    <div className="contracts-zone-detail-progress">
                      {formatFulfillment(selectedZone.fulfillmentPercent)}
                    </div>
                  </div>

                  <div className="contracts-zone-metrics">
                    <div className="contracts-metric-card">
                      <span>Zone Goal</span>
                      <strong>{formatTreeCount(selectedZone.goalTreeCount)}</strong>
                      <small>trees</small>
                    </div>
                    <div className="contracts-metric-card">
                      <span>Zone Planted</span>
                      <strong>{formatTreeCount(selectedZone.plantedTreeCount)}</strong>
                      <small>trees</small>
                    </div>
                    <div className="contracts-metric-card">
                      <span>Area Count</span>
                      <strong>{formatTreeCount(selectedZone.areaCount)}</strong>
                      <small>areas</small>
                    </div>
                  </div>

                  <div className="contracts-area-section">
                    <div className="contracts-area-head">
                      <h3>Area Contributions</h3>
                      <span>These area tree counts make up the selected zone total.</span>
                    </div>
                    {selectedZone.areas.length > 0 ? (
                      <div className="contracts-area-list">
                        {selectedZone.areas.map((area) => (
                          <div className="contracts-area-row" key={area.areaId}>
                            <div className="contracts-area-copy">
                              <strong>{area.areaName}</strong>
                              <span>{area.areaId}</span>
                            </div>
                            <div className="contracts-area-count">
                              <strong>{formatTreeCount(area.currentTreeCount)}</strong>
                              <span>trees planted</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyStatePanel
                        className="bakki-card-empty-state"
                        heading="No areas recorded"
                        message="No mapped areas are currently contributing tree counts to this zone."
                      />
                    )}
                  </div>
                </SurfaceCard>
              ) : null}
            </div>
          ) : (
            <EmptyStatePanel
              className="bakki-card-empty-state"
              heading="No zone contracts available"
              message="Zone-level contract rollups will appear here once mapped areas and contract goals exist."
            />
          )}
        </div>
      </div>
    </section>
  );
}
