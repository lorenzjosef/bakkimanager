import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { PageStatePanel } from '@bakki/ui';
import { localAssetUrls } from '@bakki/domain';
import {
  LOGIN_REDIRECT_STORAGE_KEY,
  useLoginMutation,
  useSessionStatus,
} from '@/queries/auth';

function resolveRedirectPath() {
  const stored = sessionStorage.getItem(LOGIN_REDIRECT_STORAGE_KEY);
  if (stored && stored.startsWith('/')) {
    return stored;
  }

  return '/dashboard';
}

export function LoginPage() {
  const navigate = useNavigate();
  const sessionQuery = useSessionStatus();
  const loginMutation = useLoginMutation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const redirectPath = useMemo(() => resolveRedirectPath(), []);

  useEffect(() => {
    if (!sessionQuery.data?.session?.authenticated) {
      return;
    }

    sessionStorage.removeItem(LOGIN_REDIRECT_STORAGE_KEY);
    void navigate({ replace: true, to: redirectPath });
  }, [navigate, redirectPath, sessionQuery.data?.session?.authenticated]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    try {
      await loginMutation.mutateAsync({
        username: username.trim(),
        password,
      });
      sessionStorage.removeItem(LOGIN_REDIRECT_STORAGE_KEY);
      void navigate({ replace: true, to: redirectPath });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Login failed.');
    }
  };

  if (sessionQuery.isPending) {
    return (
      <section className="auth-screen">
        <PageStatePanel
          eyebrow="Authentication"
          heading="Checking session"
          message="Confirming whether you already have an active Bakki session."
        />
      </section>
    );
  }

  return (
    <section className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <img src={localAssetUrls.brandMark} alt="" />
          <div>
            <div className="auth-brand-title">Bakki Manager</div>
            <div className="auth-brand-subtitle">Forestry Management</div>
          </div>
        </div>

        <div className="auth-copy">
          <span className="auth-eyebrow">Secure Access</span>
          <h1>Sign in to Bakki</h1>
          <p>Use your Odoo-backed Bakki credentials to access the admin workspace.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Username</span>
            <input
              autoComplete="username"
              name="username"
              onChange={(event) => setUsername(event.target.value)}
              placeholder="e.g. alain.decat"
              required
              type="text"
              value={username}
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input
              autoComplete="current-password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
              type="password"
              value={password}
            />
          </label>

          {errorMessage ? (
            <div className="auth-error" role="alert">
              {errorMessage}
            </div>
          ) : null}

          <button className="auth-submit" disabled={loginMutation.isPending} type="submit">
            {loginMutation.isPending ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      </div>
    </section>
  );
}
