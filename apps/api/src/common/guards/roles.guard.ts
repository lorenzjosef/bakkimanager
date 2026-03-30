import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { UserRoleDesignation } from '@bakki/domain';
import { ROLES_KEY } from '../decorators';
import type { AuthenticatedUser } from '../session';

/**
 * Role-based authorization guard.
 * Must be used after SessionAuthGuard which attaches request.user.
 * If no @Roles() decorator is present, allows any authenticated user.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRoleDesignation[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No role restriction specified - allow any authenticated user
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user?.session?.user?.role) {
      throw new ForbiddenException('Access denied');
    }

    const userRole = user.session.user.role;

    if (!requiredRoles.includes(userRole)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
