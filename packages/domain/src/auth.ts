export type BakkiUserRole = 'owner' | 'planter';

export interface BakkiSessionUser {
  id: string;
  displayName: string;
  username: string;
  role: BakkiUserRole;
  mobileAccessEnabled: boolean;
  canResetCredentials: boolean;
  activePlantingPhaseId: string | null;
}

export interface BakkiSessionState {
  authenticated: boolean;
  issuedAt: string;
  expiresAt: string;
  user: BakkiSessionUser;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  session: BakkiSessionState;
}

export interface SessionRefreshResponse {
  session: BakkiSessionState;
}

export interface SessionStatusResponse {
  session: BakkiSessionState | null;
}

export interface LogoutResponse {
  success: true;
}

export interface ResetUserPasswordRequest {
  targetUserId: string;
  reason: string;
}

export interface ResetUserPasswordResponse {
  targetUserId: string;
  username: string;
  temporaryPassword: string;
  resetAt: string;
}
