import type { SVGProps } from 'react';

type MapIconProps = SVGProps<SVGSVGElement>;

function BaseIcon({ children, viewBox = '0 0 24 24', ...props }: MapIconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.9"
      viewBox={viewBox}
      {...props}
    >
      {children}
    </svg>
  );
}

export function MapCloseIcon(props: MapIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </BaseIcon>
  );
}

export function MapTaskCreateIcon(props: MapIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 6v12" />
      <path d="M6 12h12" />
    </BaseIcon>
  );
}

export function MapGeometryEditIcon(props: MapIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 16.5V20h3.5L18 9.5 14.5 6 4 16.5z" />
      <path d="M13 7.5l3.5 3.5" />
    </BaseIcon>
  );
}

export function MapToolZoneIcon(props: MapIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M6 7l5-2 7 3v9l-5 2-7-3V7z" />
      <circle cx="6" cy="7" r="1" fill="currentColor" stroke="none" />
      <circle cx="11" cy="5" r="1" fill="currentColor" stroke="none" />
      <circle cx="18" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="18" cy="17" r="1" fill="currentColor" stroke="none" />
      <circle cx="13" cy="19" r="1" fill="currentColor" stroke="none" />
      <circle cx="6" cy="16" r="1" fill="currentColor" stroke="none" />
    </BaseIcon>
  );
}

export function MapToolAreaIcon(props: MapIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M5 7l6-2.5L19 8v8l-6 2.5L5 15V7z" />
      <path d="M11 4.5v8" />
      <path d="M5 7l8 3.5L19 8" />
    </BaseIcon>
  );
}

export function MapToolPenIcon(props: MapIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 20l4.5-1 8.8-8.8a2 2 0 0 0 0-2.8l-.7-.7a2 2 0 0 0-2.8 0L5 15.5 4 20z" />
      <path d="M12.5 7.5l4 4" />
    </BaseIcon>
  );
}

export function MapToolPolygonIcon(props: MapIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M6.5 7.5h11v9h-11z" />
      <path d="M6.5 12h11" />
      <path d="M12 7.5v9" />
    </BaseIcon>
  );
}

export function MapToolNodeIcon(props: MapIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M7 8l5 4 5-5" />
      <path d="M12 12v5" />
      <circle cx="7" cy="8" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="17" cy="7" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="17" r="1.5" fill="currentColor" stroke="none" />
    </BaseIcon>
  );
}

export function MapZoomInIcon(props: MapIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 7v10" />
      <path d="M7 12h10" />
    </BaseIcon>
  );
}

export function MapZoomOutIcon(props: MapIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M7 12h10" />
    </BaseIcon>
  );
}

export function MapResetIcon(props: MapIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M18 8a7 7 0 1 0 1 6.5" />
      <path d="M18 4v4h-4" />
    </BaseIcon>
  );
}

export function MapLayerIcon(props: MapIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 5l7 4-7 4-7-4 7-4z" />
      <path d="M5 13l7 4 7-4" />
      <path d="M5 17l7 4 7-4" />
    </BaseIcon>
  );
}

export function MapSaveIcon(props: MapIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M6 12.5l4 4 8-9" />
    </BaseIcon>
  );
}

export function MapChevronDownIcon(props: MapIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M6.5 9.5l5.5 5 5.5-5" />
    </BaseIcon>
  );
}

export function MapVerifiedIcon(props: MapIconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M8.5 12.2l2.2 2.2 4.8-5" />
    </BaseIcon>
  );
}
