import type {
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  ResetUserPasswordRequest,
  ResetUserPasswordResponse,
  SessionRefreshResponse,
  SessionStatusResponse,
} from '@bakki/domain';

export const AUTH_ROUTES = {
  login: '/auth/login',
  session: '/auth/session',
  refresh: '/auth/refresh',
  logout: '/auth/logout',
  resetUserPassword: '/auth/reset-user-password',
} as const;

/**
 * Bakki auth/session contract.
 *
 * Transport rules:
 * - web auth is cookie-based
 * - NestJS sets and refreshes the HttpOnly session cookie
 * - frontend code never handles raw session tokens directly
 * - desktop uses the same endpoints and later adds secure local persistence
 *
 * Backend rules:
 * - NestJS authenticates against Odoo Online-backed user records
 * - Odoo Online remains the external credential authority
 * - Bakki manages the session lifecycle after successful login
 * - owner-triggered password reset/regenerate replaces the earlier reveal/copy flow
 */
export interface AuthContractDefinition {
  [AUTH_ROUTES.login]: {
    method: 'POST';
    request: LoginRequest;
    response: LoginResponse;
  };
  [AUTH_ROUTES.session]: {
    method: 'GET';
    response: SessionStatusResponse;
  };
  [AUTH_ROUTES.refresh]: {
    method: 'POST';
    response: SessionRefreshResponse;
  };
  [AUTH_ROUTES.logout]: {
    method: 'POST';
    response: LogoutResponse;
  };
  [AUTH_ROUTES.resetUserPassword]: {
    method: 'POST';
    request: ResetUserPasswordRequest;
    response: ResetUserPasswordResponse;
  };
}
