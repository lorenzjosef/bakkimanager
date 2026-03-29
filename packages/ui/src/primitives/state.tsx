import React, { type HTMLAttributes, type ReactNode } from 'react';
import { ButtonSurface } from './core';
import { joinClassNames } from './shared';

interface StateActionProps {
  label: ReactNode;
  onAction: () => void;
}

interface PageStatePanelProps extends HTMLAttributes<HTMLDivElement> {
  tone?: 'neutral' | 'warning' | 'error';
  eyebrow?: ReactNode;
  heading: ReactNode;
  message: ReactNode;
  action?: StateActionProps;
}

export function PageStatePanel({
  className,
  tone = 'neutral',
  eyebrow,
  heading,
  message,
  action,
  ...props
}: PageStatePanelProps) {
  return (
    <div className={joinClassNames('bakki-state-panel', `is-${tone}`, className)} {...props}>
      {eyebrow ? <span className="bakki-state-panel-eyebrow">{eyebrow}</span> : null}
      <h2 className="bakki-state-panel-title">{heading}</h2>
      <p className="bakki-state-panel-message">{message}</p>
      {action ? (
        <ButtonSurface className="bakki-state-panel-action" onClick={action.onAction} type="button">
          {action.label}
        </ButtonSurface>
      ) : null}
    </div>
  );
}

interface InlineStatusBannerProps extends HTMLAttributes<HTMLDivElement> {
  tone?: 'neutral' | 'warning' | 'error';
  heading: ReactNode;
  message: ReactNode;
  action?: StateActionProps;
}

export function InlineStatusBanner({
  className,
  tone = 'neutral',
  heading,
  message,
  action,
  ...props
}: InlineStatusBannerProps) {
  return (
    <div className={joinClassNames('bakki-inline-banner', `is-${tone}`, className)} {...props}>
      <div className="bakki-inline-banner-copy">
        <strong>{heading}</strong>
        <p>{message}</p>
      </div>
      {action ? (
        <ButtonSurface className="bakki-inline-banner-action" onClick={action.onAction} type="button">
          {action.label}
        </ButtonSurface>
      ) : null}
    </div>
  );
}

interface EmptyStatePanelProps extends HTMLAttributes<HTMLDivElement> {
  heading: ReactNode;
  message: ReactNode;
}

export function EmptyStatePanel({
  className,
  heading,
  message,
  ...props
}: EmptyStatePanelProps) {
  return (
    <div className={joinClassNames('bakki-empty-state', className)} {...props}>
      <strong>{heading}</strong>
      <p>{message}</p>
    </div>
  );
}

interface StatusChipProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  label: ReactNode;
  fallbackVisual?: ReactNode;
}

export function StatusChip({
  className,
  icon,
  label,
  fallbackVisual,
  ...props
}: StatusChipProps) {
  return (
    <div className={className} {...props}>
      {icon ?? fallbackVisual}
      <span>{label}</span>
    </div>
  );
}
