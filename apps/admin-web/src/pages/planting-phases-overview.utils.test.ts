import assert from 'node:assert/strict';
import test from 'node:test';
import type { PlantingPhaseOverviewData } from '@bakki/domain';
import { resolvePlantingPhasesOverviewRenderState } from './planting-phases-overview.utils';

const phaseOverview: PlantingPhaseOverviewData = {
  bannerCopy: 'Create the next planting phase.',
  bannerEyebrow: 'Phase Operations',
  bannerIconUrl: 'icon',
  bannerOutlineLabel: 'Review Areas',
  bannerPrimaryLabel: 'Begin Setup',
  bannerTitle: 'Initialize Next Planting Phase',
  exportIconUrl: 'export',
  insightsTitle: 'Phase Planning Insights',
  liveChipLabel: 'Awaiting Phase',
  mapEyebrow: 'Selected Phase Areas',
  mapTitle: 'No phase areas available',
  nitrogenInsight: {
    bordered: true,
    copy: 'No contracted areas are linked to a planting phase yet.',
    iconUrl: 'nitrogen',
    id: 'areas',
  },
  overviewTitle: 'Phase Overview',
  phases: [],
  sectionLabelIconUrl: 'section',
  selectedPhaseId: null,
  soilTrackingLabel: 'Contract Fulfillment',
  soilTrackingValue: '0%',
  startButtonIconUrl: 'start',
  teamButtonLabel: 'View All Members',
  teamCardTitle: 'Field Operations Team',
  teamMembers: [],
  teamTotal: '0',
  teamTotalLabel: 'Assigned',
  weatherInsight: {
    copy: 'No density measurements are available yet.',
    iconUrl: 'climate',
    id: 'density',
    title: 'Average Density',
    value: 'Unavailable',
  },
};

test('resolvePlantingPhasesOverviewRenderState distinguishes loading, unavailable, and ready states', () => {
  assert.equal(resolvePlantingPhasesOverviewRenderState(undefined, true), 'loading');
  assert.equal(resolvePlantingPhasesOverviewRenderState(undefined, false), 'unavailable');
  assert.equal(resolvePlantingPhasesOverviewRenderState(phaseOverview, false), 'ready');
});
