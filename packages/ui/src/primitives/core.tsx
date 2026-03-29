import React, { type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react';
import { joinClassNames } from './shared';

interface SurfaceCardProps extends HTMLAttributes<HTMLElement> {
  as?: 'article' | 'section' | 'aside' | 'div';
  children: ReactNode;
}

export function SurfaceCard({
  as = 'article',
  className,
  children,
  ...props
}: SurfaceCardProps) {
  const Component = as;
  return (
    <Component className={className} {...props}>
      {children}
    </Component>
  );
}

interface ButtonSurfaceProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export function ButtonSurface({
  type = 'button',
  className,
  children,
  ...props
}: ButtonSurfaceProps) {
  return (
    <button className={className} type={type} {...props}>
      {children}
    </button>
  );
}

interface ActionButtonProps extends Omit<ButtonSurfaceProps, 'children'> {
  label: ReactNode;
  leadingVisual?: ReactNode;
  trailingVisual?: ReactNode;
  labelClassName?: string;
  leadingClassName?: string;
  trailingClassName?: string;
}

export function ActionButton({
  className,
  label,
  leadingVisual,
  trailingVisual,
  labelClassName,
  leadingClassName,
  trailingClassName,
  ...props
}: ActionButtonProps) {
  return (
    <ButtonSurface className={className} {...props}>
      {leadingVisual ? <span className={leadingClassName}>{leadingVisual}</span> : null}
      <span className={labelClassName}>{label}</span>
      {trailingVisual ? <span className={trailingClassName}>{trailingVisual}</span> : null}
    </ButtonSurface>
  );
}

interface FormFieldGridProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function FormFieldGrid({ className, children, ...props }: FormFieldGridProps) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}

interface StaticFieldProps {
  className: string;
  label: ReactNode;
  value: ReactNode;
  valueClassName: string;
}

export function StaticField({ className, label, value, valueClassName }: StaticFieldProps) {
  return (
    <label className={className}>
      <span>{label}</span>
      <div className={valueClassName}>{value}</div>
    </label>
  );
}

interface TableSurfaceProps extends HTMLAttributes<HTMLElement> {
  as?: 'section' | 'div';
  header?: ReactNode;
  cardClassName?: string;
  footer?: ReactNode;
  children: ReactNode;
}

export function TableSurface({
  as = 'section',
  className,
  header,
  cardClassName,
  footer,
  children,
  ...props
}: TableSurfaceProps) {
  const Component = as;

  return (
    <Component className={className} {...props}>
      {header}
      <div className={cardClassName}>{children}</div>
      {footer}
    </Component>
  );
}

interface SplitDetailLayoutProps extends HTMLAttributes<HTMLDivElement> {
  detailOpen: boolean;
  openClassName?: string;
  mainClassName: string;
  detailClassName: string;
  main: ReactNode;
  detail: ReactNode;
}

export function SplitDetailLayout({
  className,
  detailOpen,
  openClassName,
  mainClassName,
  detailClassName,
  main,
  detail,
  ...props
}: SplitDetailLayoutProps) {
  return (
    <div className={joinClassNames(className, detailOpen && openClassName)} {...props}>
      <div className={mainClassName}>{main}</div>
      <aside className={detailClassName} hidden={!detailOpen}>
        {detail}
      </aside>
    </div>
  );
}
