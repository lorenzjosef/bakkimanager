import React, { type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react';
import { SurfaceCard } from './core';
import { joinClassNames } from './shared';

interface SettingsSectionRowProps extends HTMLAttributes<HTMLElement> {
  copy: ReactNode;
  children: ReactNode;
}

export function SettingsSectionRow({
  className,
  copy,
  children,
  ...props
}: SettingsSectionRowProps) {
  return (
    <section className={joinClassNames('settings-figma-section-row', className)} {...props}>
      <div className="settings-figma-copy-column">{copy}</div>
      <div className="settings-figma-content-column">{children}</div>
    </section>
  );
}

interface SettingsReadOnlyFieldProps {
  label: ReactNode;
  value: ReactNode;
  chevron?: boolean;
  eye?: boolean;
  icon?: 'pin' | 'phone';
  monospace?: boolean;
}

export function SettingsReadOnlyField({
  label,
  value,
  chevron = false,
  eye = false,
  icon,
  monospace = false,
}: SettingsReadOnlyFieldProps) {
  return (
    <label className="settings-figma-field">
      <span className="settings-figma-label">{label}</span>
      <div className={`settings-figma-input${monospace ? ' is-mono' : ''}`}>
        {icon ? <span className="settings-figma-input-leading">{icon === 'pin' ? '⌖' : '☎'}</span> : null}
        <strong>{value}</strong>
        {chevron ? <span className="settings-figma-input-trailing">⌄</span> : null}
        {eye ? <span className="settings-figma-input-trailing">◉</span> : null}
      </div>
    </label>
  );
}

interface SettingsToggleSwitchProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  on: boolean;
  compact?: boolean;
  dark?: boolean;
}

export function SettingsToggleSwitch({
  className,
  on,
  compact = false,
  dark = false,
  type = 'button',
  ...props
}: SettingsToggleSwitchProps) {
  return (
    <button
      aria-pressed={on}
      className={joinClassNames(
        'settings-figma-toggle',
        on && 'is-on',
        compact && 'compact',
        dark && 'dark',
        className,
      )}
      type={type}
      {...props}
    >
      <span />
    </button>
  );
}

interface SettingsToggleRowProps extends HTMLAttributes<HTMLDivElement> {
  label: ReactNode;
  copy?: ReactNode;
  on: boolean;
  compact?: boolean;
  dark?: boolean;
}

export function SettingsToggleRow({
  className,
  label,
  copy,
  on,
  compact = false,
  dark = false,
  ...props
}: SettingsToggleRowProps) {
  return (
    <div
      className={joinClassNames(
        'settings-figma-toggle-row',
        compact && 'compact',
        dark && 'dark',
        className,
      )}
      {...props}
    >
      <div>
        <strong>{label}</strong>
        {copy ? <p>{copy}</p> : null}
      </div>
      <SettingsToggleSwitch dark={dark} on={on} compact={compact} />
    </div>
  );
}

interface SettingsLayerChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  checked: boolean;
  label: ReactNode;
}

export function SettingsLayerChip({
  checked,
  className,
  label,
  type = 'button',
  ...props
}: SettingsLayerChipProps) {
  return (
    <button
      className={joinClassNames('settings-figma-layer-chip', checked && 'is-checked', className)}
      type={type}
      {...props}
    >
      <span className="settings-figma-checkbox">{checked ? '✓' : ''}</span>
      <strong>{label}</strong>
    </button>
  );
}

interface SettingsPanelCardProps extends HTMLAttributes<HTMLElement> {
  icon: ReactNode;
  heading: ReactNode;
  sections: Array<{ label: ReactNode; copy: ReactNode; on: boolean }>;
}

export function SettingsPanelCard({
  className,
  heading,
  icon,
  sections,
  ...props
}: SettingsPanelCardProps) {
  return (
    <section className={joinClassNames('settings-figma-block', className)} {...props}>
      <div className="settings-figma-block-head compact with-icon">
        <div className="settings-figma-section-title-row compact">
          <div className="settings-figma-section-icon">{icon}</div>
          <h2>{heading}</h2>
        </div>
      </div>
      <div className="settings-figma-panel-stack">
        {sections.map((section) => (
          <SurfaceCard
            as="article"
            className="settings-figma-surface settings-figma-toggle-panel"
            key={String(section.label)}
          >
            <SettingsToggleRow copy={section.copy} label={section.label} on={section.on} />
          </SurfaceCard>
        ))}
      </div>
    </section>
  );
}
