import {
  SettingsLayerChip,
  SettingsPanelCard,
  SettingsReadOnlyField,
  SettingsSectionRow,
  SettingsToggleRow,
  SettingsToggleSwitch,
  SurfaceCard,
} from '@bakki/ui';
import { localAssetUrls } from '@bakki/domain';

export function GeneralSettingsContent() {
  return (
    <div className="settings-figma-stack">
      <SettingsSectionRow
        copy={<>
          <h2>System Profile</h2>
          <p>Identity markers for the ranching operations within the Icelandic southern territory.</p>
        </>}
      >
        <SurfaceCard as="article" className="settings-figma-surface settings-figma-soft-surface">
          <div className="settings-figma-field-grid settings-figma-field-grid-2">
            <SettingsReadOnlyField label="Display Mode" value="AUTO" />
            <SettingsReadOnlyField icon="pin" label="Operational Location" value="Bakki" />
          </div>
        </SurfaceCard>
      </SettingsSectionRow>

      <SettingsSectionRow
        copy={<>
          <h2>Regional Settings</h2>
          <p>Localized standards for temporal data and physical measurements.</p>
        </>}
      >
        <SurfaceCard as="article" className="settings-figma-surface settings-figma-soft-surface settings-figma-vertical-gap">
          <SettingsReadOnlyField chevron label="Primary Timezone" value="Greenwich Mean Time (GMT+00:00)" />
          <div className="settings-figma-field">
            <span className="settings-figma-label">Measurement System</span>
            <div className="settings-figma-segmented">
              <button className="settings-figma-segment is-active" type="button">Metric</button>
              <button className="settings-figma-segment" type="button">Imperial</button>
            </div>
          </div>
        </SurfaceCard>
      </SettingsSectionRow>

      <SettingsSectionRow
        copy={<>
          <h2>Data Thresholds</h2>
          <p>Critical triggers for system alerts and survival success forecasting.</p>
        </>}
      >
        <SurfaceCard as="article" className="settings-figma-surface settings-figma-soft-surface">
          <div className="settings-figma-field-grid settings-figma-field-grid-2">
            <div className="settings-figma-threshold-card">
              <div className="settings-figma-threshold-head">
                <span className="settings-figma-label">Global Target Survival</span>
                <strong>94%</strong>
              </div>
              <div className="settings-figma-slider-track"><span /></div>
              <p>Baseline expectation for new planting cycles.</p>
            </div>
            <div className="settings-figma-threshold-card">
              <span className="settings-figma-label">Critical Weather Wind Speed</span>
              <div className="settings-figma-input with-unit">
                <strong>45</strong>
                <span>km/h</span>
              </div>
              <p>System-wide alert threshold for gale-force conditions.</p>
            </div>
          </div>
        </SurfaceCard>
      </SettingsSectionRow>

      <div className="settings-figma-actions-row">
        <button className="settings-figma-ghost-action" type="button">Cancel</button>
        <button className="settings-figma-primary-action" type="button">Save Changes</button>
      </div>
    </div>
  );
}

export function NotificationsSettingsContent() {
  return (
    <div className="settings-figma-notification-grid">
      <SurfaceCard as="article" className="settings-figma-surface settings-figma-notification-card">
        <div className="settings-figma-section-title-row">
          <div className="settings-figma-section-icon">✉</div>
          <h2>Email Notifications</h2>
        </div>
        <div className="settings-figma-toggle-stack">
          <SettingsToggleRow copy="A comprehensive report of planting progress and soil health." label="Daily Summary" on />
          <SettingsToggleRow copy="Immediate notification for server downtime or Odoo sync errors." label="Critical Alerts" on />
          <SettingsToggleRow copy="Receive an email when a field team completes a designated sector." label="Task Completions" on={false} />
        </div>
      </SurfaceCard>

      <SurfaceCard as="article" className="settings-figma-push-card">
        <div className="settings-figma-section-title-row inverse">
          <div className="settings-figma-section-icon inverse">◫</div>
          <h2>Push Notifications (Mobile)</h2>
        </div>
        <div className="settings-figma-toggle-stack compact inverse">
          <SettingsToggleRow compact dark label="Proximity Alerts" on />
          <SettingsToggleRow compact dark label="Weather Warnings" on />
          <SettingsToggleRow compact dark label="Team Check-ins" on={false} />
        </div>
        <div className="settings-figma-push-foot">Real-time alerts via the Tectonic Field App.</div>
      </SurfaceCard>

      <SurfaceCard as="article" className="settings-figma-surface settings-figma-sms-card">
        <div className="settings-figma-section-title-row">
          <div className="settings-figma-section-icon">⌁</div>
          <h2>SMS Alerts</h2>
        </div>
        <div className="settings-figma-field-stack">
          <SettingsReadOnlyField icon="phone" label="Phone Number" value="+354 888 2390" />
          <div className="settings-figma-alert-row">
            <div className="settings-figma-alert-copy">
              <span className="settings-figma-icon-badge warning">!</span>
              <strong>Emergency System Failures</strong>
            </div>
            <SettingsToggleSwitch on />
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard as="article" className="settings-figma-surface settings-figma-quiet-card">
        <div className="settings-figma-quiet-glow" />
        <div className="settings-figma-section-title-row">
          <div className="settings-figma-section-icon">☾</div>
          <h2>Quiet Hours</h2>
        </div>
        <p className="settings-figma-support-copy">Suppress non-critical notifications during these hours. Emergency system failures will bypass this setting.</p>
        <div className="settings-figma-field-grid settings-figma-field-grid-2">
          <SettingsReadOnlyField chevron label="Start Time" value="10:00 PM" />
          <SettingsReadOnlyField chevron label="End Time" value="06:00 AM" />
        </div>
      </SurfaceCard>
    </div>
  );
}

export function MapSettingsContent() {
  return (
    <div className="settings-figma-map-grid">
      <div className="settings-figma-map-left">
        <SettingsPanelCard
          icon="◉"
          heading="Visual Fidelity"
          sections={[
            {
              label: 'Enable Map Terrain Shadows',
              copy: 'Dynamic hillshading based on Icelandic solar angles.',
              on: true,
            },
            {
              label: 'Show Area Labels at High Zoom',
              copy: 'Micro-zone naming appears above 18x zoom.',
              on: false,
            },
            {
              label: 'Display Real-time Task Highlights',
              copy: 'Pulsing indicators for active planting and fertilization crews.',
              on: true,
            },
          ]}
        />

        <section className="settings-figma-block">
          <div className="settings-figma-block-head compact with-icon">
            <div className="settings-figma-section-title-row compact">
              <div className="settings-figma-section-icon">≡</div>
              <h2>Data Layers</h2>
            </div>
          </div>
          <div className="settings-figma-option-grid settings-figma-layers-grid">
            <SettingsLayerChip checked label="Zones" />
            <SettingsLayerChip checked label="Areas" />
            <SettingsLayerChip checked={false} label="Active Tasks" />
            <SettingsLayerChip checked={false} label="Soil Quality" />
          </div>
        </section>

        <section className="settings-figma-block">
          <div className="settings-figma-block-head compact with-icon">
            <div className="settings-figma-section-title-row compact">
              <div className="settings-figma-section-icon">⌖</div>
              <h2>Coordinate System</h2>
            </div>
          </div>
          <SurfaceCard as="article" className="settings-figma-surface settings-figma-coordinate-card">
            <SettingsReadOnlyField chevron label="Primary Grid Projection" value="WGS84 (Decimal Degrees)" />
            <p className="settings-figma-support-copy">Changes coordinate readouts in the map header and GPS export files. Recommends ISN2016 for local precision mapping.</p>
          </SurfaceCard>
        </section>
      </div>

      <div className="settings-figma-map-right">
        <SurfaceCard as="article" className="settings-figma-map-preview-card">
          <img alt="Map preview" src={localAssetUrls.phaseMap} />
          <div className="settings-figma-map-preview-overlay" />
          <div className="settings-figma-map-preview-badge">
            <span>Live Preview</span>
            <strong>Zoom Level: 14.5x</strong>
          </div>
          <div className="settings-figma-map-preview-meta">
            <span>Lat 64.1265° N</span>
            <span>Lon 21.8174° W</span>
          </div>
          <div className="settings-figma-map-preview-controls">
            <button type="button">+</button>
            <button type="button">-</button>
          </div>
        </SurfaceCard>

        <SurfaceCard as="article" className="settings-figma-surface settings-figma-legend-card">
          <h2>Legend Configuration</h2>
          <div className="settings-figma-legend-row">
            <span className="settings-figma-legend-chip growth">Primary Growth</span>
            <span className="settings-figma-legend-chip hydration">Hydration Grid</span>
            <span className="settings-figma-legend-chip basalt">Basalt Shelf</span>
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
