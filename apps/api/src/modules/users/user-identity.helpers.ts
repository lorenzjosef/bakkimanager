import { BadRequestException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import {
  localAssetUrls,
  type UserPermissionGroup,
  type UserRecord,
  type UserRoleDesignation,
  type UserRoleOption,
} from '@bakki/domain';
import type { BakkiUserMirrorRecord } from '../../bakki-core/bakki-user-mirror.service';
import type { OdooService } from '../../odoo/odoo.service';

export interface OdooIdentityUserRecord {
  active?: boolean;
  avatar_128?: false | string;
  group_ids?: number[] | false;
  id: number;
  login?: string;
  name?: string;
  share?: boolean;
}

export async function inferRoleFromOdooUser(params: {
  groupIdCache: Map<string, number>;
  odoo: OdooService;
  user: OdooIdentityUserRecord;
}): Promise<UserRoleDesignation> {
  const ownerGroupId = await resolveGroupId({
    cache: params.groupIdCache,
    moduleName: 'base',
    odoo: params.odoo,
    recordName: 'group_system',
  });
  const groupIds = Array.isArray(params.user.group_ids)
    ? params.user.group_ids.filter((value): value is number => typeof value === 'number')
    : [];

  return groupIds.includes(ownerGroupId) ? 'owner' : 'planter';
}

export async function resolveGroupId(params: {
  cache: Map<string, number>;
  moduleName: string;
  odoo: OdooService;
  recordName: string;
}) {
  const cacheKey = `${params.moduleName}.${params.recordName}`;
  const cached = params.cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const [modelData] = await params.odoo.searchRead<{ res_id?: number }>(
    'ir.model.data',
    [
      ['module', '=', params.moduleName],
      ['name', '=', params.recordName],
    ],
    ['res_id'],
    { limit: 1 },
  );

  if (!modelData?.res_id) {
    throw new BadRequestException(`Missing Odoo group mapping for ${cacheKey}`);
  }

  params.cache.set(cacheKey, modelData.res_id);
  return modelData.res_id;
}

export function generateTemporaryPassword() {
  return `BK-${randomBytes(2).toString('hex').toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`;
}

export function parseTrailingNumericId(value: string) {
  const match = value.match(/(\d+)$/)?.[1];
  return match ? Number(match) : null;
}

export function mapMirrorToUserRecord(
  mirror: BakkiUserMirrorRecord,
  avatarByOdooUserId: Map<number, string> = new Map(),
): UserRecord {
  const isOwner = mirror.role === 'owner';

  return {
    id: `user-profile-${mirror.id}`,
    fullName: mirror.displayName || `User ${mirror.odooUserId}`,
    username: mirror.login || `user.${mirror.odooUserId}`,
    roleLabel: isOwner ? 'Owner' : 'Planter',
    isOwner,
    isActive: mirror.active,
    mobileAccessEnabled: mirror.mobileAccessEnabled,
    avatarUrl:
      avatarByOdooUserId.get(mirror.odooUserId)
      || avatarForRole(mirror.role),
  };
}

export function getRoleOptions(): UserRoleOption[] {
  return [
    { id: 'planter', label: 'Planter' },
    { id: 'owner', label: 'Owner' },
  ];
}

export function getPermissionGroups(role: UserRoleDesignation): UserPermissionGroup[] {
  const isOwner = role === 'owner';

  return [
    {
      id: 'data-sovereignty',
      eyebrow: 'Data Sovereignty',
      items: [
        { label: 'Can Create Zones', checked: isOwner },
        { label: 'Can Edit Terrain Data', checked: isOwner },
        { label: 'Can Delete Tasks', checked: isOwner },
      ],
    },
    {
      id: 'field-access',
      eyebrow: 'Field Access',
      items: [
        { label: 'Mobile App Access', checked: true },
        { label: 'Offline Registry Sync', checked: !isOwner },
      ],
    },
  ];
}

export function getPermissionsNote(role: UserRoleDesignation) {
  return role === 'owner'
    ? 'Owner permissions include ranch administration, geometry editing, and privileged account reset operations.'
    : 'Planter permissions focus on field execution, mobile access, and offline work support without ranch administration.';
}

function avatarForRole(role: UserRoleDesignation) {
  return role === 'owner' ? localAssetUrls.userBjorn : localAssetUrls.userHelga;
}
