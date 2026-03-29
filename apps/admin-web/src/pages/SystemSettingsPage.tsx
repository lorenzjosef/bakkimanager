import { useNavigate } from '@tanstack/react-router';
import {
  getSettingsTitle,
  SETTINGS_TABS,
  type SettingsVariant,
} from './system-settings.page-utils';
import {
  GeneralSettingsContent,
  MapSettingsContent,
  NotificationsSettingsContent,
} from './system-settings.sections';
import { OdooSettingsContent } from './system-settings.odoo';

interface SystemSettingsPageProps {
  variant: SettingsVariant;
}

export function SystemSettingsPage({ variant }: SystemSettingsPageProps) {
  const navigate = useNavigate();

  return (
    <section className="view is-active" id={`view-settings-${variant}`}>
      <div className="page-content settings-figma-page">
        <header className="settings-figma-header">
          <h1>{getSettingsTitle(variant)}</h1>
          <nav className="settings-figma-tabs" aria-label="Settings sections">
            {SETTINGS_TABS.map((tab) => (
              <button
                className={`settings-figma-tab${tab.id === variant ? ' is-active' : ''}`}
                key={tab.id}
                onClick={() => navigate({ to: tab.path })}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </header>

        {variant === 'general' ? <GeneralSettingsContent /> : null}
        {variant === 'odoo' ? <OdooSettingsContent /> : null}
        {variant === 'notifications' ? <NotificationsSettingsContent /> : null}
        {variant === 'map' ? <MapSettingsContent /> : null}
      </div>
    </section>
  );
}
