import type { ReactNode, SVGProps } from 'react';
import { localAssetUrls, SHELL_NAV_ITEMS, type BakkiViewId } from '@bakki/domain';
export * from './primitives';

interface BakkiShellProps {
  title: string;
  activeView: BakkiViewId;
  activeUtility?: 'settings' | 'support';
  currentUserName: string;
  currentUserRole: string;
  onNavigate: (view: BakkiViewId) => void;
  onOpenSettings: () => void;
  onOpenSupport: () => void;
  onOpenCreateTask: () => void;
  onLogout: () => void;
  children: ReactNode;
}

export function BakkiShell({
  title,
  activeView,
  activeUtility,
  currentUserName,
  currentUserRole,
  onNavigate,
  onOpenSettings,
  onOpenSupport,
  onOpenCreateTask,
  onLogout,
  children,
}: BakkiShellProps) {
  const shellAvatarUrl = resolveShellAvatarUrl(currentUserName);

  return (
    <div className="app-shell">
      <aside className="sidebar sidebar-contemporary">
        <div className="sidebar-main">
          <div className="sidebar-brand contemporary-brand">
            <div
              className="brand-mark"
              style={{ backgroundImage: `url("${localAssetUrls.brandMark}")` }}
            />
            <div>
              <div className="brand-title">Bakki Manager</div>
              <div className="brand-subtitle">Forestry Management</div>
            </div>
          </div>

          <button className="primary-sidebar-button contemporary-cta" onClick={onOpenCreateTask} type="button">
            <span className="cta-plus">+</span>
            <span>Create Task</span>
          </button>

          <nav className="sidebar-nav contemporary-nav">
            {SHELL_NAV_ITEMS.map((item) => {
              const isActive = item.id === activeView;
              return (
                <button
                  className={`nav-item${isActive ? ' is-active' : ''}`}
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  type="button"
                >
                  <span className="nav-icon">{renderNavIcon(item.id)}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="sidebar-footer contemporary-footer">
          <div className="utility-links contemporary-utility-links">
            <button
              className={`utility-link contemporary-utility-link${activeUtility === 'settings' ? ' is-active' : ''}`}
              onClick={onOpenSettings}
              type="button"
            >
              Settings
            </button>
            <button
              className={`utility-link contemporary-utility-link${activeUtility === 'support' ? ' is-active' : ''}`}
              onClick={onOpenSupport}
              type="button"
            >
              Support
            </button>
          </div>
          <div className="owner-card contemporary-owner-card">
            <div
              className="owner-avatar contemporary-owner-avatar"
              style={{ backgroundImage: `url("${shellAvatarUrl}")` }}
            />
            <div>
              <div className="owner-name">{currentUserName}</div>
              <div className="owner-role">{currentUserRole}</div>
            </div>
            <button className="owner-menu" aria-label="Sign out" onClick={onLogout} type="button">
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-title" id="page-title">{title}</div>
          <div className="topbar-search-wrap">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input className="topbar-search" type="text" placeholder="Search data points..." />
          </div>
          <div className="topbar-actions">
            <button className="icon-button" aria-label="Notifications" type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V10a6 6 0 1 0-12 0v4.2a2 2 0 0 1-.6 1.4L4 17h5" />
                <path d="M10 17a2 2 0 0 0 4 0" />
              </svg>
              <span className="notification-dot" />
            </button>
            <button className="topbar-cta" onClick={onOpenCreateTask} type="button">Create Task</button>
          </div>
        </header>

        <main className="page-wrap">{children}</main>
      </div>
    </div>
  );
}

function resolveShellAvatarUrl(currentUserName: string) {
  switch (currentUserName) {
    case 'Alain de Cat':
      return localAssetUrls.ownerAlain;
    case 'Björn Sigurðsson':
      return localAssetUrls.userBjorn;
    case 'Helga Jónsdóttir':
      return localAssetUrls.userHelga;
    case 'Einar Þorsteinsson':
      return localAssetUrls.userEinar;
    case 'Mrs. Baue':
      return localAssetUrls.planterMrsBaue;
    case 'Mr. Baue':
      return localAssetUrls.planterMrBaue;
    default:
      return localAssetUrls.ownerAlain;
  }
}

function renderNavIcon(view: BakkiViewId): ReactNode {
  switch (view) {
    case 'dashboard':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
          <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
        </svg>
      );
    case 'map-viewer':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M9 18L3.5 20.5V6L9 3.5M9 18l6-2.5M9 18V3.5M15 15.5l5.5 2.5V3.5L15 1m0 14.5V1" />
        </svg>
      );
    case 'map-management':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 7h16M4 12h10M4 17h8" />
          <path d="M18 14l3 3-6 6H12v-3l6-6z" />
        </svg>
      );
    case 'phase-summary':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 21c4.418 0 8-3.582 8-8S16.418 5 12 5 4 8.582 4 13s3.582 8 8 8z" />
          <path d="M12 9v4l3 2" />
          <path d="M8 3h8" />
        </svg>
      );
    case 'contracts':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M7 3.5h7l4.5 4.5V19a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2z" />
          <path d="M14 3.5V8h4.5" />
          <path d="M8.5 12h7M8.5 16h7" />
        </svg>
      );
    case 'users':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
          <circle cx="9.5" cy="7" r="3.5" />
          <path d="M20 8v6M17 11h6" />
        </svg>
      );
    case 'species':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 22c4-4 6-7 6-10a6 6 0 0 0-12 0c0 3 2 6 6 10z" />
          <path d="M12 9c1.8 0 3.5-.9 5-2.5" />
        </svg>
      );
    case 'task-management':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      );
  }
}
