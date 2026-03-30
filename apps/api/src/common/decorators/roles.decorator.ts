import { SetMetadata } from '@nestjs/common';
import type { UserRoleDesignation } from '@bakki/domain';

export const ROLES_KEY = 'roles';

/**
 * Restricts access to users with specified roles.
 * If not specified, any authenticated user can access the route.
 */
export const Roles = (...roles: UserRoleDesignation[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Shorthand for owner-only routes.
 */
export const OwnerOnly = () => Roles('owner');
