import { UnauthorizedException } from '@nestjs/common';
import type { AuthService } from './auth.service';

export interface OwnerSessionActor {
  actorId: string;
}

export async function requireOwnerSessionActor(params: {
  authService: Pick<AuthService, 'getSession'>;
  sessionToken?: string;
  unauthorizedMessage: string;
}): Promise<OwnerSessionActor> {
  const { session } = await params.authService.getSession(params.sessionToken);
  if (!session?.authenticated || session.user.role !== 'owner') {
    throw new UnauthorizedException(params.unauthorizedMessage);
  }

  return {
    actorId: session.user.id,
  };
}
