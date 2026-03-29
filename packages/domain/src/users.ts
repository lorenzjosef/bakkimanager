export type UserRoleDesignation = 'planter' | 'owner';

export interface UserRoleOption {
  id: UserRoleDesignation;
  label: string;
}

export interface UserPermissionItem {
  label: string;
  checked: boolean;
}

export interface UserPermissionGroup {
  id: string;
  eyebrow: string;
  items: UserPermissionItem[];
}

export interface UserRecord {
  id: string;
  fullName: string;
  username: string;
  roleLabel: string;
  isOwner: boolean;
  isActive: boolean;
  mobileAccessEnabled: boolean;
  avatarUrl: string;
}

export interface UserManagementData {
  firstNamePlaceholder: string;
  lastNamePlaceholder: string;
  previewUsernamePlaceholder: string;
  roleOptions: UserRoleOption[];
  permissionsTitle: string;
  permissionGroups: UserPermissionGroup[];
  permissionsNote: string;
  registryTitle: string;
  registrySubtitle: string;
  registryUsers: UserRecord[];
}

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  role: UserRoleDesignation;
  temporaryPassword?: string;
}

export interface CreateUserResponse {
  createdUser: UserRecord;
  generatedUsername: string;
  temporaryPassword: string;
}

export interface UpdateUserStatusRequest {
  active: boolean;
}

export interface UpdateUserStatusResponse {
  targetUserId: string;
  updatedUser: UserRecord;
}

export const GENERATED_USER_LOGIN_DOMAIN = 'bakki.example';

export function buildDisplayName(firstName: string, lastName: string) {
  return [firstName, lastName]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(' ');
}

export function buildGeneratedUsernameCandidate(firstName: string, lastName: string) {
  const normalized = [firstName, lastName]
    .map((value) =>
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '.')
        .replace(/^\.+|\.+$/g, ''),
    )
    .filter(Boolean)
    .join('.');

  return normalized || 'new.user';
}

export function buildGeneratedUserLoginCandidate(firstName: string, lastName: string) {
  return `${buildGeneratedUsernameCandidate(firstName, lastName)}@${GENERATED_USER_LOGIN_DOMAIN}`;
}
