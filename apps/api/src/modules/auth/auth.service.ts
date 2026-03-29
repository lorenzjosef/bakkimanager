import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import type {
  BakkiSessionState,
  LoginResponse,
  ResetUserPasswordResponse,
  SessionRefreshResponse,
  SessionStatusResponse,
} from '@bakki/domain';
import { BakkiUserMirrorService } from '../../bakki-core/bakki-user-mirror.service';
import { OdooService } from '../../odoo/odoo.service';
import { AuditService } from '../audit/audit.service';
import {
  AuthContext,
  loadOdooAuthContextByUserId,
  SessionEntry,
} from './auth.service.identity';
import {
  generateTemporaryPassword,
  parseTrailingNumericId,
} from '../users/user-identity.helpers';

export const BAKKI_SESSION_COOKIE = 'bakki_session';
export const BAKKI_DESKTOP_CLIENT_HEADER = 'x-bakki-client';
export const BAKKI_DESKTOP_CLIENT_VALUE = 'desktop';
export const BAKKI_DESKTOP_SESSION_HEADER = 'x-bakki-session';
export const BAKKI_DESKTOP_SESSION_CLEAR_HEADER = 'x-bakki-clear-session';
const SESSION_DURATION_MS = 1000 * 60 * 60 * 8;

function resolveHeaderValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0]?.trim() || undefined;
  }

  return typeof value === 'string' ? value.trim() || undefined : undefined;
}

function appendExposedHeader(response: Response, headerName: string) {
  const existing = response.getHeader('Access-Control-Expose-Headers');
  const currentHeaders = Array.isArray(existing)
    ? existing.flatMap((value) => String(value).split(','))
    : typeof existing === 'string'
      ? existing.split(',')
      : [];
  const exposedHeaders = currentHeaders
    .map((value) => value.trim())
    .filter(Boolean);

  if (!exposedHeaders.includes(headerName)) {
    exposedHeaders.push(headerName);
  }

  response.setHeader('Access-Control-Expose-Headers', exposedHeaders.join(', '));
}

export function isDesktopClientRequest(request: Pick<Request, 'headers'>) {
  return resolveHeaderValue(request.headers[BAKKI_DESKTOP_CLIENT_HEADER]) === BAKKI_DESKTOP_CLIENT_VALUE;
}

export function getRequestSessionToken(request: Pick<Request, 'cookies' | 'headers'>) {
  return resolveHeaderValue(request.headers[BAKKI_DESKTOP_SESSION_HEADER])
    ?? request.cookies?.[BAKKI_SESSION_COOKIE];
}

export function applyDesktopSessionResponse(
  request: Pick<Request, 'headers'>,
  response: Response,
  sessionToken?: string | null,
) {
  if (!isDesktopClientRequest(request) || !sessionToken) {
    return;
  }

  response.setHeader(BAKKI_DESKTOP_SESSION_HEADER, sessionToken);
  appendExposedHeader(response, BAKKI_DESKTOP_SESSION_HEADER);
}

export function applyDesktopSessionClearResponse(request: Pick<Request, 'headers'>, response: Response) {
  if (!isDesktopClientRequest(request)) {
    return;
  }

  response.setHeader(BAKKI_DESKTOP_SESSION_CLEAR_HEADER, '1');
  appendExposedHeader(response, BAKKI_DESKTOP_SESSION_CLEAR_HEADER);
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly ownerGroupIdCache = new Map<string, number>();
  private readonly sessions = new Map<string, SessionEntry>();

  constructor(
    private readonly auditService: AuditService,
    private readonly bakkiUsers: BakkiUserMirrorService,
    private readonly odoo: OdooService,
  ) {}

  async login(username: string, password: string, sessionToken = this.createCookieToken()): Promise<LoginResponse> {
    this.pruneExpiredSessions();

    if (!this.hasLiveIdentityBackend()) {
      throw new ServiceUnavailableException('Bakki identity backend is currently unavailable.');
    }

    const authenticatedUserId = await this.odoo.authenticateUserCredentials(username, password);
    if (!authenticatedUserId) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const authContext = await this.loadOdooAuthContextByUserId(authenticatedUserId);
    if (!authContext || !authContext.userId) {
      throw new UnauthorizedException('User account is inactive or missing');
    }

    const session = await this.createSession(authContext, sessionToken);
    await this.auditService.recordEvent({
      actor: session.user.id,
      message: 'User logged in',
      type: 'auth.login',
      targetModel: 'res.users',
      targetResId: authContext.userId,
    });

    return { session };
  }

  async getSession(sessionToken?: string): Promise<SessionStatusResponse> {
    this.pruneExpiredSessions();
    const session = await this.resolveSession(sessionToken);
    return { session };
  }

  async requireAuthenticatedSession(sessionToken?: string) {
    const { session } = await this.requireSession(sessionToken);
    return session;
  }

  async requireSessionActor(sessionToken?: string) {
    const { entry, session } = await this.requireSession(sessionToken);
    return {
      session,
      profileId: entry.profileId,
      userId: entry.userId,
    };
  }

  async refresh(sessionToken?: string): Promise<SessionRefreshResponse> {
    this.pruneExpiredSessions();
    const { entry } = await this.requireSession(sessionToken);
    entry.issuedAt = Date.now();
    entry.expiresAt = entry.issuedAt + SESSION_DURATION_MS;

    const refreshedSession = await this.buildSessionFromEntry(entry);
    await this.auditService.recordEvent({
      actor: refreshedSession.user.id,
      message: 'Session refreshed',
      type: 'auth.refresh',
      targetModel: 'res.users',
      targetResId: entry.userId ?? undefined,
    });

    return { session: refreshedSession };
  }

  async logout(sessionToken?: string) {
    this.pruneExpiredSessions();
    if (!sessionToken) {
      return { success: true as const };
    }

    const existing = this.sessions.get(sessionToken);
    if (!existing) {
      return { success: true as const };
    }

    this.sessions.delete(sessionToken);
    await this.auditService.recordEvent({
      actor: existing.profileId ? `user-profile-${existing.profileId}` : existing.username,
      message: 'User logged out',
      type: 'auth.logout',
      targetModel: 'res.users',
      targetResId: existing.userId ?? undefined,
    });

    return { success: true as const };
  }

  async resetUserPassword(
    targetUserId: string,
    reason: string,
    sessionToken?: string,
  ): Promise<ResetUserPasswordResponse> {
    this.pruneExpiredSessions();
    const { entry, session } = await this.requireSession(sessionToken);
    if (!session.user.canResetCredentials || session.user.role !== 'owner') {
      throw new UnauthorizedException('Only Bakki owners can reset user passwords');
    }

    if (!this.hasLiveIdentityBackend()) {
      throw new ServiceUnavailableException('Bakki identity backend is currently unavailable.');
    }

    const targetMirrorId = parseTrailingNumericId(targetUserId);
    if (!targetMirrorId) {
      throw new BadRequestException('Invalid target user identifier');
    }

    const mirror = await this.bakkiUsers.getById(targetMirrorId);
    if (!mirror) {
      throw new UnauthorizedException('Unknown target user');
    }

    const temporaryPassword = generateTemporaryPassword();

    try {
      await this.odoo.executeKw<boolean>('res.users', 'write', [
        [mirror.odooUserId],
        { password: temporaryPassword },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown password reset error';
      this.logger.error(`Odoo password reset failed for ${mirror.login}: ${message}`);
      throw new BadRequestException('Password could not be reset in Odoo.');
    }

    await this.auditService.recordEvent({
      actor: session.user.id,
      message: `Reset password for ${mirror.login}`,
      type: 'auth.reset_password',
      targetModel: 'bakki_user',
      targetResId: mirror.id,
      payload: { reason, odooUserId: mirror.odooUserId },
    });

    return {
      targetUserId,
      username: mirror.login,
      temporaryPassword,
      resetAt: new Date().toISOString(),
    };
  }

  createSessionCookie() {
    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    };
  }

  createCookieToken() {
    return randomUUID();
  }

  revokeSessionsForUserId(userId: number) {
    this.pruneExpiredSessions();
    for (const [token, entry] of this.sessions.entries()) {
      if (entry.userId === userId) {
        this.sessions.delete(token);
      }
    }
  }

  revokeSessionsForUsername(username: string) {
    this.pruneExpiredSessions();
    for (const [token, entry] of this.sessions.entries()) {
      if (entry.username === username) {
        this.sessions.delete(token);
      }
    }
  }

  private pruneExpiredSessions(now = Date.now()) {
    for (const [token, entry] of this.sessions.entries()) {
      if (entry.expiresAt <= now) {
        this.sessions.delete(token);
      }
    }
  }

  private hasLiveIdentityBackend() {
    return this.odoo.isConfigured();
  }

  private async createSession(context: AuthContext, sessionToken: string) {
    const now = Date.now();
    const entry: SessionEntry = {
      token: sessionToken,
      userId: context.userId,
      profileId: context.profileId,
      username: context.generatedUsername,
      issuedAt: now,
      expiresAt: now + SESSION_DURATION_MS,
    };

    this.sessions.set(entry.token, entry);
    return this.buildSessionFromContext(entry, context);
  }

  private async resolveSession(sessionToken?: string) {
    if (!sessionToken) {
      return null;
    }

    const entry = this.sessions.get(sessionToken);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      this.sessions.delete(sessionToken);
      return null;
    }

    try {
      return await this.buildSessionFromEntry(entry);
    } catch {
      this.sessions.delete(sessionToken);
      return null;
    }
  }

  private async requireSession(sessionToken?: string) {
    if (!sessionToken) {
      throw new UnauthorizedException('No active session');
    }

    const entry = this.sessions.get(sessionToken);
    if (!entry) {
      throw new UnauthorizedException('No active session');
    }

    if (entry.expiresAt <= Date.now()) {
      this.sessions.delete(sessionToken);
      throw new UnauthorizedException('Session expired');
    }

    const session = await this.buildSessionFromEntry(entry);
    return { entry, session };
  }

  private async buildSessionFromEntry(entry: SessionEntry): Promise<BakkiSessionState> {
    if (!this.hasLiveIdentityBackend()) {
      throw new UnauthorizedException('Identity backend is unavailable');
    }

    if (!entry.userId) {
      throw new UnauthorizedException('Session is missing Odoo user identity');
    }

    const context = await this.loadOdooAuthContextByUserId(entry.userId);
    if (!context || !context.userId) {
      throw new UnauthorizedException('User account is inactive or missing');
    }

    return this.buildSessionFromContext(entry, context);
  }

  private buildSessionFromContext(entry: SessionEntry, context: AuthContext): BakkiSessionState {
    return {
      authenticated: true,
      issuedAt: new Date(entry.issuedAt).toISOString(),
      expiresAt: new Date(entry.expiresAt).toISOString(),
      user: {
        id: context.profileId ? `user-profile-${context.profileId}` : `user-${context.userId}`,
        displayName: context.displayName,
        username: context.generatedUsername,
        role: context.role,
        mobileAccessEnabled: context.mobileAccessEnabled,
        canResetCredentials: context.canResetCredentials,
        activePlantingPhaseId: context.activePlantingPhaseId,
      },
    };
  }

  private async loadOdooAuthContextByUserId(userId: number): Promise<AuthContext | null> {
    return loadOdooAuthContextByUserId({
      bakkiUsers: this.bakkiUsers,
      groupIdCache: this.ownerGroupIdCache,
      logger: this.logger,
      odoo: this.odoo,
      userId,
    });
  }
}
