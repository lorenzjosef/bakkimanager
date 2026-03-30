import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators';
import { AuthService, getRequestSessionToken } from '../../modules/auth/auth.service';
import type { AuthenticatedUser } from '../session';

declare module 'express' {
  interface Request {
    user?: AuthenticatedUser;
  }
}

/**
 * Global authentication guard.
 * All routes require authentication unless marked with @Public().
 */
@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const sessionToken = getRequestSessionToken(request);

    if (!sessionToken) {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      const { entry, session } = await this.authService.requireSessionWithEntry(sessionToken);

      // Attach authenticated user context to request
      request.user = {
        session,
        entry,
        profileId: entry.profileId,
        userId: entry.userId,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Session validation failed');
    }
  }
}
