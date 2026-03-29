import {
  getViewIdForPath,
  ROUTE_META,
  VIEW_TO_PATH,
  type BakkiViewId,
  type BakkiRouteMeta,
} from '@bakki/domain';

export interface ShellRouteState {
  activeView: BakkiViewId;
  activeUtility: BakkiRouteMeta['utilityView'];
  navView: BakkiViewId;
  settingsPath: string;
  supportPath: string;
  title: string;
}

export function buildShellRouteState(pathname: string): ShellRouteState {
  const activeView = getViewIdForPath(pathname);
  const meta = ROUTE_META[activeView];

  return {
    activeView,
    activeUtility: meta.utilityView,
    navView: meta.navView,
    settingsPath: VIEW_TO_PATH['settings-general'],
    supportPath: VIEW_TO_PATH.support,
    title: meta.title,
  };
}
