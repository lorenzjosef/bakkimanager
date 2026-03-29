import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import 'ol/ol.css';
import { localAssetUrls } from '@bakki/domain';
import '@/prototype/prototype.styles.css';
import { router } from '@/router';

const queryClient = new QueryClient();

document.body.classList.add('contemporary-mode');

const runtimeAssetVariables = {
  '--contemporary-brand': `url("${localAssetUrls.brandMark}")`,
  '--contemporary-forest': `url("${localAssetUrls.forest}")`,
  '--contemporary-map': `url("${localAssetUrls.dashboardMap}")`,
  '--contemporary-profile': `url("${localAssetUrls.ownerAlain}")`,
  '--contemporary-species-a': `url("${localAssetUrls.speciesDowny}")`,
  '--contemporary-species-b': `url("${localAssetUrls.speciesRowan}")`,
} as const;

for (const [name, value] of Object.entries(runtimeAssetVariables)) {
  document.documentElement.style.setProperty(name, value);
}

for (const assetUrl of [
  localAssetUrls.brandMark,
  localAssetUrls.dashboardMap,
  localAssetUrls.forest,
  localAssetUrls.ownerAlain,
  localAssetUrls.speciesDowny,
  localAssetUrls.speciesRowan,
]) {
  const image = new Image();
  image.src = assetUrl;
}

class AppErrorBoundary extends React.Component<
  React.PropsWithChildren,
  { hasError: boolean }
> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page-content">
          <div className="bakki-state-panel is-error">
            <span className="bakki-state-panel-eyebrow">Application Error</span>
            <h2 className="bakki-state-panel-title">A screen crashed</h2>
            <p className="bakki-state-panel-message">
              Reload the page. If the problem persists, inspect the console and fix the failing route.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </AppErrorBoundary>,
);
