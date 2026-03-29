import type { UserManagementData } from '@bakki/domain';

export type UserManagementRenderState = 'loading' | 'unavailable' | 'ready';

export function resolveUserManagementRenderState(
  data: UserManagementData | null | undefined,
  isPending: boolean,
) {
  if (isPending && !data) {
    return 'loading' as const;
  }

  if (!data) {
    return 'unavailable' as const;
  }

  return 'ready' as const;
}

export function canCreateUser(firstName: string, lastName: string, isCreatingUser: boolean) {
  return firstName.trim().length > 0 && lastName.trim().length > 0 && !isCreatingUser;
}

export function buildPreviewPassword(random = Math.random) {
  const first = random().toString(16).slice(2, 6).toUpperCase();
  const second = random().toString(16).slice(2, 6).toUpperCase();
  return `BK-${first}-${second}`;
}

export function getCredentialHelperMessage(
  sessionPending: boolean,
  canResetCredentials: boolean,
) {
  if (sessionPending) {
    return 'Checking session permissions...';
  }

  if (canResetCredentials) {
    return 'This action is audited. A new temporary password will replace the current one.';
  }

  return 'An active owner session is required to reset passwords.';
}

export function buildUserStatusCopy(isActive: boolean) {
  return `This will set the account to ${isActive ? 'inactive' : 'active'}. Deactivated users lose access on their next authenticated request.`;
}

export function canSubmitCredentialReset(
  reason: string,
  canResetCredentials: boolean,
  isPending: boolean,
) {
  return canResetCredentials && reason.trim().length >= 4 && !isPending;
}
