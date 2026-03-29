import type { Logger } from '@nestjs/common';
import type { UserRoleDesignation } from '@bakki/domain';
import { type BakkiUserMirrorRecord, type BakkiUserMirrorService } from '../../bakki-core/bakki-user-mirror.service';
import type { OdooService } from '../../odoo/odoo.service';
import {
  inferRoleFromOdooUser,
  type OdooIdentityUserRecord,
} from '../users/user-identity.helpers';

export interface SessionEntry {
  expiresAt: number;
  issuedAt: number;
  profileId: number | null;
  token: string;
  userId: number | null;
  username: string;
}

export interface AuthContext {
  activePlantingPhaseId: string | null;
  canResetCredentials: boolean;
  displayName: string;
  generatedUsername: string;
  mobileAccessEnabled: boolean;
  profileId: number | null;
  role: 'owner' | 'planter';
  userId: number | null;
}

export async function loadOdooAuthContextByUserId(params: {
  bakkiUsers: BakkiUserMirrorService;
  groupIdCache: Map<string, number>;
  logger: Pick<Logger, 'warn'>;
  odoo: OdooService;
  userId: number;
}): Promise<AuthContext | null> {
  const [user] = await params.odoo.searchRead<OdooIdentityUserRecord>(
    'res.users',
    [['id', '=', params.userId]],
    ['name', 'login', 'active', 'group_ids'],
    { limit: 1 },
  );
  if (!user || user.active === false) {
    return null;
  }

  let existingMirror: BakkiUserMirrorRecord | null = null;
  try {
    existingMirror = await params.bakkiUsers.getByOdooUserId(user.id);
  } catch (error) {
    const role = await inferRoleFromOdooUser({
      groupIdCache: params.groupIdCache,
      odoo: params.odoo,
      user,
    });
    const message = error instanceof Error ? error.message : 'Unknown auth mirror lookup error';
    params.logger.warn(
      `Bakki user mirror lookup unavailable during auth for Odoo user ${user.id}; continuing with Odoo identity only. ${message}`,
    );
    return buildAuthContextFromOdooUser(user, role);
  }

  const role = await inferRoleFromOdooUser({
    groupIdCache: params.groupIdCache,
    odoo: params.odoo,
    user,
  });
  let mirror = existingMirror;

  try {
    mirror = await params.bakkiUsers.upsert({
      odooUserId: user.id,
      login: user.login || existingMirror?.login || `user.${user.id}`,
      displayName: user.name || existingMirror?.displayName || user.login || `User ${user.id}`,
      role,
      active: user.active ?? true,
      mobileAccessEnabled: existingMirror?.mobileAccessEnabled ?? true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown auth mirror sync error';
    await markAuthMirrorFailure(params.bakkiUsers, params.logger, user.id, message);
    params.logger.warn(
      `Bakki user mirror sync unavailable during auth for Odoo user ${user.id}; continuing with Odoo identity only. ${message}`,
    );
    return buildAuthContextFromOdooUser(user, role, existingMirror);
  }

  return buildAuthContextFromOdooUser(user, role, mirror);
}

function buildAuthContextFromOdooUser(
  user: OdooIdentityUserRecord,
  role: UserRoleDesignation,
  mirror?: BakkiUserMirrorRecord | null,
): AuthContext {
  return {
    userId: user.id,
    profileId: mirror?.id ?? null,
    displayName: mirror?.displayName || user.name || user.login || `User ${user.id}`,
    generatedUsername: mirror?.login || user.login || `user.${user.id}`,
    role,
    mobileAccessEnabled: mirror?.mobileAccessEnabled ?? true,
    canResetCredentials: Boolean(mirror?.id) && role === 'owner',
    activePlantingPhaseId: null,
  };
}

async function markAuthMirrorFailure(
  bakkiUsers: BakkiUserMirrorService,
  logger: Pick<Logger, 'warn'>,
  odooUserId: number,
  message: string,
) {
  try {
    await bakkiUsers.markSyncFailureByOdooUserId(odooUserId, message);
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown auth mirror failure write error';
    logger.warn(
      `Bakki user mirror failure could not be recorded for Odoo user ${odooUserId}. ${detail}`,
    );
  }
}
