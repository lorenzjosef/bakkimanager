import React, { type HTMLAttributes, type ReactNode } from 'react';
import { SurfaceCard } from './core';
import { joinClassNames } from './shared';

interface SupportStatusBarProps extends HTMLAttributes<HTMLDivElement> {
  label: ReactNode;
  detail: ReactNode;
}

export function SupportStatusBar({
  className,
  label,
  detail,
  ...props
}: SupportStatusBarProps) {
  return (
    <div className={joinClassNames('support-figma-status-bar', className)} {...props}>
      <span className="support-figma-status-dot" />
      <strong>{label}</strong>
      <span className="support-figma-status-divider" />
      <span>{detail}</span>
    </div>
  );
}

interface SupportActionCardProps extends HTMLAttributes<HTMLElement> {
  tone?: 'light' | 'dark';
  icon: ReactNode;
  heading: ReactNode;
  description?: ReactNode;
  compactCopy?: boolean;
  children?: ReactNode;
}

export function SupportActionCard({
  as,
  children,
  className,
  compactCopy = false,
  description,
  heading,
  icon,
  tone = 'light',
  ...props
}: SupportActionCardProps & { as?: 'article' | 'section' | 'aside' | 'div' }) {
  const toneClassName = tone === 'dark' ? 'support-figma-card-dark' : 'support-figma-card-light';
  const iconClassName = tone === 'dark' ? 'support-figma-icon-tile dark' : 'support-figma-icon-tile';

  return (
    <SurfaceCard
      as={as ?? 'article'}
      className={joinClassNames('support-figma-card', toneClassName, className)}
      {...props}
    >
      <div className={iconClassName}>{icon}</div>
      <div className={joinClassNames('support-figma-copy-block', compactCopy && 'compact')}>
        <h2>{heading}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {children}
    </SurfaceCard>
  );
}
