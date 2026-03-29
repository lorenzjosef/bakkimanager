import React, { type HTMLAttributes, type ReactNode } from 'react';
import { SurfaceCard } from './core';

interface SummaryMetricCardProps extends HTMLAttributes<HTMLElement> {
  as?: 'article' | 'section' | 'div';
  label: ReactNode;
  value: ReactNode;
  support?: ReactNode;
}

export function SummaryMetricCard({
  as = 'article',
  className,
  label,
  value,
  support,
  ...props
}: SummaryMetricCardProps) {
  const Component = as;

  return (
    <Component className={className} {...props}>
      <span>{label}</span>
      <strong>{value}</strong>
      {support ? <p>{support}</p> : null}
    </Component>
  );
}

interface MapOverlayPanelProps extends HTMLAttributes<HTMLElement> {
  as?: 'article' | 'section' | 'aside' | 'div';
  bodyClassName?: string;
  footer?: ReactNode;
  footerClassName?: string;
  children: ReactNode;
}

export function MapOverlayPanel({
  as = 'article',
  bodyClassName,
  children,
  className,
  footer,
  footerClassName,
  ...props
}: MapOverlayPanelProps) {
  return (
    <SurfaceCard as={as} className={className} {...props}>
      <div className={bodyClassName}>{children}</div>
      {footer ? <footer className={footerClassName}>{footer}</footer> : null}
    </SurfaceCard>
  );
}

interface MapOverlayHeaderProps extends HTMLAttributes<HTMLElement> {
  eyebrow?: ReactNode;
  eyebrowClassName?: string;
  heading: ReactNode;
  headingId?: string;
  headingClassName?: string;
  rightContent?: ReactNode;
  actionsClassName?: string;
  closeButtonClassName: string;
  closeLabel: string;
  closeVisual: ReactNode;
  onClose: () => void;
}

export function MapOverlayHeader({
  actionsClassName,
  className,
  closeButtonClassName,
  closeLabel,
  closeVisual,
  eyebrow,
  eyebrowClassName,
  heading,
  headingClassName,
  rightContent,
  headingId,
  onClose,
  ...props
}: MapOverlayHeaderProps) {
  return (
    <header className={className} {...props}>
      <div className={headingClassName}>
        {eyebrow ? <div className={eyebrowClassName}>{eyebrow}</div> : null}
        <h2 id={headingId}>{heading}</h2>
      </div>
      <div className={actionsClassName}>
        {rightContent}
        <button
          aria-label={closeLabel}
          className={closeButtonClassName}
          onClick={onClose}
          type="button"
        >
          {closeVisual}
        </button>
      </div>
    </header>
  );
}

interface MapMetricSummaryPairProps extends HTMLAttributes<HTMLElement> {
  primary: {
    className?: string;
    label: ReactNode;
    support?: ReactNode;
    value: ReactNode;
  };
  secondary: {
    className?: string;
    label: ReactNode;
    support?: ReactNode;
    value: ReactNode;
  };
}

export function MapMetricSummaryPair({
  className,
  primary,
  secondary,
  ...props
}: MapMetricSummaryPairProps) {
  return (
    <section className={className} {...props}>
      <SummaryMetricCard
        className={primary.className}
        label={primary.label}
        support={primary.support}
        value={primary.value}
      />
      <SummaryMetricCard
        className={secondary.className}
        label={secondary.label}
        support={secondary.support}
        value={secondary.value}
      />
    </section>
  );
}
