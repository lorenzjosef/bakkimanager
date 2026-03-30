import type { LoginResponse, SessionStatusResponse } from '@bakki/domain';
import { apiRequest, setSessionToken, getSessionToken } from './client';

export interface AuthApi {
  login(username: string, password: string): Promise<LoginResponse>;
  getSession(): Promise<SessionStatusResponse>;
  logout(): Promise<void>;
  refreshSession(): Promise<SessionStatusResponse>;
}

export const authApi: AuthApi = {
  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { username, password },
    });
    return response.data;
  },

  async getSession(): Promise<SessionStatusResponse> {
    const response = await apiRequest<SessionStatusResponse>('/auth/session');
    return response.data;
  },

  async logout(): Promise<void> {
    await apiRequest('/auth/logout', { method: 'POST' });
    setSessionToken(null);
  },

  async refreshSession(): Promise<SessionStatusResponse> {
    const response = await apiRequest<SessionStatusResponse>('/auth/session/refresh', {
      method: 'POST',
    });
    return response.data;
  },
};

export { setSessionToken, getSessionToken };
