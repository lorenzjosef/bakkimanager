import type { SVGProps } from 'react';
import type { TaskDistributionItem, TaskTableRow } from '@bakki/domain';

export function resolveTaskToneIcon(
  tone: TaskDistributionItem['tone'] | TaskTableRow['activityTone'],
) {
  switch (tone) {
    case 'monitoring':
      return <TaskMonitoringIcon />;
    case 'fertilizing':
      return <TaskFertilizingIcon />;
    default:
      return <TaskPlantingIcon />;
  }
}

export function buildAssigneeInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return 'U';
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'U';
}

function TaskBaseIcon({ children, viewBox = '0 0 24 24', ...props }: SVGProps<SVGSVGElement>) {
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

function TaskPlantingIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <TaskBaseIcon {...props}>
      <path d="M12 20V11" />
      <path d="M7.5 15.5c0-3.4 2-5.9 4.5-7.5 2.5 1.6 4.5 4.1 4.5 7.5" />
      <path d="M9 7.5c.4-2 1.6-3.4 3-4.5 1.4 1.1 2.6 2.5 3 4.5" />
    </TaskBaseIcon>
  );
}

function TaskMonitoringIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <TaskBaseIcon {...props}>
      <circle cx="11" cy="11" r="5.5" />
      <path d="M16 16l4 4" />
      <path d="M11 8.5v2.8l2 1.4" />
    </TaskBaseIcon>
  );
}

function TaskFertilizingIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <TaskBaseIcon {...props}>
      <path d="M7 8.5h10l-1.2 9H8.2L7 8.5z" />
      <path d="M9.5 8.5V6.8a2.5 2.5 0 0 1 5 0v1.7" />
      <path d="M12 12v3.5" />
    </TaskBaseIcon>
  );
}

export function TaskPersonnelIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <TaskBaseIcon {...props}>
      <circle cx="9" cy="9" r="2.5" />
      <circle cx="16" cy="10" r="2.2" />
      <path d="M4.8 18c.6-2.2 2.5-3.8 4.8-3.8S13.8 15.8 14.4 18" />
      <path d="M13.6 18c.5-1.8 2-3 3.8-3 1.1 0 2.1.4 2.8 1.1" />
    </TaskBaseIcon>
  );
}

export function TaskChevronDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <TaskBaseIcon {...props}>
      <path d="M7 9.5l5 5 5-5" />
    </TaskBaseIcon>
  );
}

export function TaskExportIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <TaskBaseIcon {...props}>
      <path d="M12 4v10" />
      <path d="M8.5 10.5L12 14l3.5-3.5" />
      <path d="M6 18.5h12" />
    </TaskBaseIcon>
  );
}

export function TaskCreateIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <TaskBaseIcon {...props}>
      <path d="M12 6v12" />
      <path d="M6 12h12" />
    </TaskBaseIcon>
  );
}

export function TaskCalendarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <TaskBaseIcon {...props}>
      <path d="M7 4.5v3" />
      <path d="M17 4.5v3" />
      <rect x="4" y="6.5" width="16" height="13" rx="2" />
      <path d="M4 10.5h16" />
    </TaskBaseIcon>
  );
}

export function TaskDraftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <TaskBaseIcon {...props}>
      <path d="M8 4.5h6l4 4v11H8a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Z" />
      <path d="M14 4.5v4h4" />
      <path d="M9.5 13h5" />
      <path d="M9.5 16h3.5" />
    </TaskBaseIcon>
  );
}

export function TaskDeployIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <TaskBaseIcon {...props}>
      <path d="M5 12h11" />
      <path d="M12 7l5 5-5 5" />
    </TaskBaseIcon>
  );
}
