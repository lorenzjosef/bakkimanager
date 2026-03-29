import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  MapMetricSummaryPair,
  MapOverlayHeader,
  MapOverlayPanel,
  SettingsPanelCard,
  SettingsReadOnlyField,
  SupportActionCard,
  SupportStatusBar,
} from '@bakki/ui';

test('SupportStatusBar renders the shared support status layout', () => {
  const html = renderToStaticMarkup(
    <SupportStatusBar detail="Last updated: now" label="ALL SYSTEMS OPERATIONAL" />,
  );

  assert.match(html, /support-figma-status-bar/);
  assert.match(html, /ALL SYSTEMS OPERATIONAL/);
  assert.match(html, /Last updated: now/);
});

test('SupportActionCard renders shared support card copy and children', () => {
  const html = renderToStaticMarkup(
    <SupportActionCard
      description="Download and inspect the logs."
      heading="Download Server Logs"
      icon="⇩"
      tone="light"
    >
      <button type="button">EXPORT .LOG BUNDLE</button>
    </SupportActionCard>,
  );

  assert.match(html, /support-figma-card/);
  assert.match(html, /Download Server Logs/);
  assert.match(html, /Download and inspect the logs\./);
  assert.match(html, /EXPORT \.LOG BUNDLE/);
});

test('SettingsPanelCard renders shared settings sections', () => {
  const html = renderToStaticMarkup(
    <SettingsPanelCard
      heading="Visual Fidelity"
      icon="◉"
      sections={[
        {
          label: 'Enable Map Terrain Shadows',
          copy: 'Dynamic hillshading based on Icelandic solar angles.',
          on: true,
        },
      ]}
    />,
  );

  assert.match(html, /Visual Fidelity/);
  assert.match(html, /Enable Map Terrain Shadows/);
  assert.match(html, /Dynamic hillshading based on Icelandic solar angles\./);
});

test('SettingsReadOnlyField renders monospace values and adornments', () => {
  const html = renderToStaticMarkup(
    <SettingsReadOnlyField chevron icon="pin" label="Instance URL" monospace value="bakki.odoo.com" />,
  );

  assert.match(html, /settings-figma-input is-mono/);
  assert.match(html, /Instance URL/);
  assert.match(html, /bakki\.odoo\.com/);
  assert.match(html, /⌖/);
  assert.match(html, /⌄/);
});

test('MapOverlayHeader renders eyebrow, heading, right content, and close affordance', () => {
  const html = renderToStaticMarkup(
    <MapOverlayHeader
      actionsClassName="map-actions"
      className="map-header"
      closeButtonClassName="map-close"
      closeLabel="Close area details"
      closeVisual={<span>X</span>}
      eyebrow="Zone 3"
      eyebrowClassName="map-zone"
      heading="Birch Ridge"
      headingClassName="map-heading"
      headingId="map-area-title"
      onClose={() => {}}
      rightContent={<span>Zone Selected</span>}
    />,
  );

  assert.match(html, /map-header/);
  assert.match(html, /Zone 3/);
  assert.match(html, /Birch Ridge/);
  assert.match(html, /Zone Selected/);
  assert.match(html, /aria-label="Close area details"/);
});

test('MapOverlayPanel and MapMetricSummaryPair render the shared map overlay shell', () => {
  const html = renderToStaticMarkup(
    <MapOverlayPanel
      bodyClassName="map-overlay-body"
      className="map-overlay-card"
      footer={<button type="button">Save Changes</button>}
      footerClassName="map-overlay-footer"
    >
      <MapMetricSummaryPair
        className="map-metric-pair"
        primary={{
          className: 'primary-metric',
          label: 'Area Density',
          support: 'Trees per 100m²',
          value: '48',
        }}
        secondary={{
          className: 'secondary-metric',
          label: 'Contract Fulfillment',
          value: '82%',
        }}
      />
    </MapOverlayPanel>,
  );

  assert.match(html, /map-overlay-card/);
  assert.match(html, /map-overlay-body/);
  assert.match(html, /Area Density/);
  assert.match(html, /Trees per 100m²/);
  assert.match(html, /Contract Fulfillment/);
  assert.match(html, /Save Changes/);
});
