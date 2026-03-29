import { Outlet, createRootRoute, useNavigate, useRouterState } from '@tanstack/react-router';
import { lazy, Suspense, useEffect } from 'react';
import { BakkiShell, PageStatePanel } from '@bakki/ui';
import { VIEW_TO_PATH } from '@bakki/domain';
import { LOGIN_REDIRECT_STORAGE_KEY, useLogoutMutation, useSessionStatus } from '@/queries/auth';
import { useUIStore } from '@/store/ui';
import { buildShellRouteState } from './root.utils';

const LazyGlobalMapTaskModal = lazy(async () => ({
  default: (await import('@/components/GlobalMapTaskModal')).GlobalMapTaskModal,
}));

function RouteLoadingFallback() {
  return (
    <div className="page-content">
      <PageStatePanel
        eyebrow="Loading"
        heading="Loading screen"
        message="Fetching the next route bundle."
      />
    </div>
  );
}

function RootTaskModal() {
  const isOpen = useUIStore((state) => state.mapTaskModalOpen);

  if (!isOpen) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <LazyGlobalMapTaskModal />
    </Suspense>
  );
}

function RootLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  const sessionQuery = useSessionStatus();
  const logoutMutation = useLogoutMutation();
  const openMapTaskModal = useUIStore((state) => state.openMapTaskModal);
  const closeMapTaskModal = useUIStore((state) => state.closeMapTaskModal);
  const closeMapAreaOverlay = useUIStore((state) => state.closeMapAreaOverlay);
  const closeManagementOverlay = useUIStore((state) => state.closeManagementOverlay);
  const closeSpeciesDetail = useUIStore((state) => state.closeSpeciesDetail);
  const resetRouteScopedUI = useUIStore((state) => state.resetRouteScopedUI);
  const shellState = buildShellRouteState(pathname);
  const isLoginRoute = pathname === '/login';
  const isStartupRoute = pathname === '/';

  useEffect(() => {
    resetRouteScopedUI();
  }, [pathname, resetRouteScopedUI]);

  useEffect(() => {
    if (isLoginRoute || isStartupRoute || sessionQuery.isPending || sessionQuery.data?.session?.authenticated) {
      return;
    }

    sessionStorage.setItem(
      LOGIN_REDIRECT_STORAGE_KEY,
      pathname === '/' ? VIEW_TO_PATH.dashboard : pathname,
    );
    void navigate({ replace: true, to: '/login' });
  }, [isLoginRoute, isStartupRoute, navigate, pathname, sessionQuery.data?.session?.authenticated, sessionQuery.isPending]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      closeMapTaskModal();
      closeMapAreaOverlay();
      closeManagementOverlay();
      closeSpeciesDetail();
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [closeManagementOverlay, closeMapAreaOverlay, closeMapTaskModal, closeSpeciesDetail]);

  if (isLoginRoute || isStartupRoute) {
    return (
      <Suspense fallback={<RouteLoadingFallback />}>
        <Outlet />
      </Suspense>
    );
  }

  if (sessionQuery.isPending) {
    return (
      <div className="page-content">
        <PageStatePanel
          eyebrow="Authentication"
          heading="Checking session"
          message="Restoring your Bakki session before loading the app shell."
        />
      </div>
    );
  }

  if (!sessionQuery.data?.session?.authenticated) {
    return (
      <div className="page-content">
        <PageStatePanel
          eyebrow="Authentication"
          heading="Redirecting to login"
          message="A valid Bakki session is required to open the admin workspace."
        />
      </div>
    );
  }

  const sessionUser = sessionQuery.data.session.user;
  const currentUserRole = sessionUser.role === 'owner' ? 'Owner' : 'Planter';

  return (
    <BakkiShell
      activeView={shellState.navView}
      activeUtility={shellState.activeUtility}
      currentUserName={sessionUser.displayName}
      currentUserRole={currentUserRole}
      onNavigate={(view) => navigate({ to: VIEW_TO_PATH[view] })}
      onOpenSettings={() => navigate({ to: shellState.settingsPath })}
      onOpenSupport={() => navigate({ to: shellState.supportPath })}
      onOpenCreateTask={openMapTaskModal}
      onLogout={() => {
        void logoutMutation.mutateAsync().finally(() => {
          sessionStorage.removeItem(LOGIN_REDIRECT_STORAGE_KEY);
          void navigate({ replace: true, to: '/login' });
        });
      }}
      title={shellState.title}
    >
      <Suspense fallback={<RouteLoadingFallback />}>
        <Outlet />
      </Suspense>
      <RootTaskModal />
    </BakkiShell>
  );
}

export const rootRoute = createRootRoute({
  component: RootLayout,
});
