import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  buildDisplayName,
  buildGeneratedUserLoginCandidate,
  type CreateUserRequest,
  type CreateUserResponse,
  type UserManagementData,
  type UserRecord,
  type UserRoleDesignation,
  type UpdateUserStatusResponse,
} from '@bakki/domain';
import { BakkiUserMirrorService, type BakkiUserMirrorRecord } from '../../bakki-core/bakki-user-mirror.service';
import { OdooService } from '../../odoo/odoo.service';
import { AuthService } from '../auth/auth.service';
import { AuditService } from '../audit/audit.service';
import { requireOwnerSessionActor } from '../auth/owner-session.helpers';
import {
  generateTemporaryPassword,
  getPermissionGroups,
  getPermissionsNote,
  getRoleOptions,
  inferRoleFromOdooUser,
  mapMirrorToUserRecord,
  parseTrailingNumericId,
  resolveGroupId,
  type OdooIdentityUserRecord,
} from './user-identity.helpers';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly groupIdCache = new Map<string, number>();

  constructor(
    private readonly auditService: AuditService,
    private readonly authService: AuthService,
    private readonly bakkiUsers: BakkiUserMirrorService,
    private readonly odoo: OdooService,
  ) {}

  async listUsers() {
    if (!this.hasLiveUserBackend()) {
      throw new ServiceUnavailableException('Bakki user directory is currently unavailable.');
    }

    try {
      const odooUsers = await this.odoo.searchRead<OdooIdentityUserRecord>(
        'res.users',
        [['share', '=', false]],
        ['name', 'login', 'active', 'avatar_128', 'group_ids'],
        { order: 'name asc' },
      );

      const avatarByUserId = new Map<number, string>();
      const mirrors: BakkiUserMirrorRecord[] = [];

      for (const user of odooUsers) {
        const mirror = await this.syncMirrorFromOdooUser(user);
        if (!mirror) {
          continue;
        }

        mirrors.push(mirror);
        if (typeof user.avatar_128 === 'string' && user.avatar_128) {
          avatarByUserId.set(user.id, `data:image/png;base64,${user.avatar_128}`);
        }
      }

      return mirrors.map((mirror) => mapMirrorToUserRecord(mirror, avatarByUserId));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown user directory error';
      this.logger.warn(`Bakki user directory read unavailable. ${message}`);
      throw new ServiceUnavailableException('Bakki user directory is currently unavailable.');
    }
  }

  async getManagementData(role: UserRoleDesignation = 'planter'): Promise<UserManagementData> {
    let users: UserRecord[] = [];

    try {
      users = await this.listUsers();
    } catch (error) {
      if (!(error instanceof ServiceUnavailableException)) {
        throw error;
      }
    }

    const activeUsers = users.filter((user) => user.isActive).length;
    const inactiveUsers = users.length - activeUsers;

    return {
      firstNamePlaceholder: 'e.g. Aris',
      lastNamePlaceholder: 'e.g. Magnusson',
      previewUsernamePlaceholder: buildGeneratedUserLoginCandidate('new', 'user'),
      roleOptions: getRoleOptions(),
      permissionsTitle: 'Permissions Panel',
      permissionGroups: getPermissionGroups(role),
      permissionsNote: getPermissionsNote(role),
      registryTitle: 'Personnel Registry',
      registrySubtitle:
        `${activeUsers} active, ${inactiveUsers} inactive, ${users.length} total synced personnel.`,
      registryUsers: users,
    };
  }

  async refreshMirrorsFromOdoo() {
    if (!this.hasLiveUserBackend()) {
      return {
        failed: 0,
        fetched: 0,
        synced: 0,
      };
    }

    const odooUsers = await this.odoo.searchRead<OdooIdentityUserRecord>(
      'res.users',
      [['share', '=', false]],
      ['name', 'login', 'active', 'avatar_128', 'group_ids'],
      { order: 'name asc' },
    );

    let synced = 0;
    let failed = 0;

    for (const user of odooUsers) {
      try {
        const mirror = await this.syncMirrorFromOdooUser(user);
        if (mirror) {
          synced += 1;
        }
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : 'Unknown user mirror refresh error';
        this.logger.warn(`User mirror refresh failed for Odoo user ${user.id}: ${message}`);
      }
    }

    return {
      failed,
      fetched: odooUsers.length,
      synced,
    };
  }

  async createUser(input: CreateUserRequest, sessionToken?: string): Promise<CreateUserResponse> {
    const actor = await this.requireOwnerActor(sessionToken);
    const normalized = this.normalizeCreateUserInput(input);

    if (!this.hasLiveUserBackend()) {
      throw new ServiceUnavailableException('Bakki user directory is currently unavailable.');
    }

    let userId: number | null = null;
    try {
      const displayName = buildDisplayName(normalized.firstName, normalized.lastName);
      const generatedUsername = await this.buildUniqueLogin(normalized.firstName, normalized.lastName);
      const temporaryPassword = normalized.temporaryPassword || generateTemporaryPassword();
      const baseUserGroupId = await resolveGroupId({
        cache: this.groupIdCache,
        moduleName: 'base',
        odoo: this.odoo,
        recordName: 'group_user',
      });
      const groupIds = [baseUserGroupId];

      if (normalized.role === 'owner') {
        const ownerGroupId = await resolveGroupId({
          cache: this.groupIdCache,
          moduleName: 'base',
          odoo: this.odoo,
          recordName: 'group_system',
        });
        groupIds.push(ownerGroupId);
      }

      userId = await this.odoo.executeKw<number>('res.users', 'create', [
        {
          name: displayName,
          login: generatedUsername,
          email: generatedUsername,
          password: temporaryPassword,
          group_ids: [[6, 0, groupIds]],
          active: true,
        },
      ]);

      const mirror = await this.bakkiUsers.upsert({
        odooUserId: userId,
        login: generatedUsername,
        displayName,
        role: normalized.role,
        active: true,
        mobileAccessEnabled: true,
      });

      const createdUser = mapMirrorToUserRecord(mirror);

      await this.auditService.recordEvent({
        actor: actor.actorId,
        message: `Created ${normalized.role} user ${generatedUsername}`,
        payload: {
          generatedUsername,
          role: normalized.role,
          odooUserId: userId,
        },
        targetModel: 'bakki_user',
        targetResId: mirror.id,
        type: 'user.create',
      });

      return {
        createdUser,
        generatedUsername,
        temporaryPassword,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown user create error';
      if (userId !== null) {
        await this.bakkiUsers.markSyncFailureByOdooUserId(userId, message);
      }
      this.logger.error(`Odoo user creation failed: ${message}`);
      throw new BadRequestException('User could not be created in Odoo.');
    }
  }

  async updateUserStatus(
    id: string,
    active: boolean,
    sessionToken?: string,
  ): Promise<UpdateUserStatusResponse> {
    const actor = await this.requireOwnerActor(sessionToken);

    if (!this.hasLiveUserBackend()) {
      throw new ServiceUnavailableException('Bakki user directory is currently unavailable.');
    }

    const mirrorId = parseTrailingNumericId(id);
    if (!mirrorId) {
      throw new BadRequestException('Invalid target user identifier.');
    }

    const mirror = await this.bakkiUsers.getById(mirrorId);
    if (!mirror) {
      throw new BadRequestException('User could not be found.');
    }

    try {
      await this.odoo.executeKw<boolean>('res.users', 'write', [
        [mirror.odooUserId],
        { active },
      ]);

      const updatedMirror = await this.bakkiUsers.updateActive(mirror.id, active);
      if (!updatedMirror) {
        throw new BadRequestException('User mirror could not be updated.');
      }

      if (!active) {
        this.authService.revokeSessionsForUserId(mirror.odooUserId);
      }

      await this.auditService.recordEvent({
        actor: actor.actorId,
        message: `${active ? 'Reactivated' : 'Deactivated'} user ${mirror.login}`,
        payload: { active, odooUserId: mirror.odooUserId },
        targetModel: 'bakki_user',
        targetResId: mirror.id,
        type: active ? 'user.reactivate' : 'auth.deactivate',
      });

      return {
        targetUserId: id,
        updatedUser: mapMirrorToUserRecord(updatedMirror),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown user status error';
      await this.bakkiUsers.markSyncFailureByOdooUserId(mirror.odooUserId, message);
      this.logger.error(`Odoo user status update failed: ${message}`);
      throw new BadRequestException('User status could not be updated.');
    }
  }

  getPermissionsPanel(role: UserRoleDesignation = 'planter') {
    return {
      title: 'Permissions Panel',
      groups: getPermissionGroups(role),
      note: getPermissionsNote(role),
    };
  }

  private hasLiveUserBackend() {
    return this.odoo.isConfigured() && this.bakkiUsers.isConfigured();
  }

  private async requireOwnerActor(sessionToken?: string) {
    if (!this.hasLiveUserBackend()) {
      throw new ServiceUnavailableException('Bakki user directory is currently unavailable.');
    }

    return requireOwnerSessionActor({
      authService: this.authService,
      sessionToken,
      unauthorizedMessage: 'Only Bakki owners can onboard personnel',
    });
  }

  private async syncMirrorFromOdooUser(user: OdooIdentityUserRecord) {
    if (!user.login) {
      return null;
    }

    const existingMirror = await this.bakkiUsers.getByOdooUserId(user.id);
    const role = await inferRoleFromOdooUser({
      groupIdCache: this.groupIdCache,
      odoo: this.odoo,
      user,
    });
    try {
      return await this.bakkiUsers.upsert({
        odooUserId: user.id,
        login: user.login,
        displayName: user.name || existingMirror?.displayName || user.login,
        role,
        active: user.active ?? true,
        mobileAccessEnabled: existingMirror?.mobileAccessEnabled ?? true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown user mirror sync error';
      await this.bakkiUsers.markSyncFailureByOdooUserId(user.id, message);
      this.logger.error(`Bakki user mirror sync failed for Odoo user ${user.id}: ${message}`);
      if (existingMirror) {
        return existingMirror;
      }
      throw error;
    }
  }

  private async buildUniqueLogin(firstName: string, lastName: string) {
    const base = buildGeneratedUserLoginCandidate(firstName, lastName);
    let candidate = base;
    let suffix = 2;

    while (await this.loginExists(candidate)) {
      const [localPart, domain = 'bakki.example'] = base.split('@');
      candidate = `${localPart}.${suffix}@${domain}`;
      suffix += 1;
    }

    return candidate;
  }

  private async loginExists(login: string) {
    const count = await this.odoo.searchCount('res.users', [['login', '=', login]]);
    return count > 0;
  }

  private normalizeCreateUserInput(input: CreateUserRequest) {
    return {
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      role: input.role,
      temporaryPassword: input.temporaryPassword?.trim() || undefined,
    };
  }

}
