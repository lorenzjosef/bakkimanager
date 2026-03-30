import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as publicly accessible, bypassing authentication.
 * Use sparingly - only for health checks and login endpoints.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
