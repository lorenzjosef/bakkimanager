const navItems = Array.from(document.querySelectorAll('[data-view]'));
const views = Array.from(document.querySelectorAll('.view'));
const pageTitle = document.getElementById('page-title');
const body = document.body;

const contemporaryViews = new Set([
  'dashboard',
  'map-viewer',
  'map-management',
  'phase-summary',
  'phase-setup-info',
  'phase-setup-team',
  'phase-setup-areas',
  'phase-setup-confirm',
  'task-management',
  'users',
  'species',
  'settings-general',
  'settings-odoo',
  'settings-notifications',
  'settings-map',
  'support',
]);

const sidebarViewMap = {
  'phase-setup-info': 'phase-summary',
  'phase-setup-team': 'phase-summary',
  'phase-setup-areas': 'phase-summary',
  'phase-setup-confirm': 'phase-summary',
};

const utilityViewMap = {
  'settings-odoo': 'settings-general',
  'settings-notifications': 'settings-general',
  'settings-map': 'settings-general',
};

const mapAreaOverlay = document.getElementById('map-area-overlay');
const mapAreaCloseButtons = Array.from(document.querySelectorAll('[data-close-area-card]'));
const mapTaskModal = document.getElementById('map-task-modal');
const mapTaskOpeners = Array.from(document.querySelectorAll('[data-open-map-task]'));
const mapTaskClosers = Array.from(document.querySelectorAll('[data-close-map-task]'));
const speciesPage = document.getElementById('species-page');
const speciesDetailPanel = document.getElementById('species-detail-panel');
const speciesDetailOpeners = Array.from(document.querySelectorAll('[data-open-species-detail]'));

const mapViewerCoordinates = document.getElementById('map-viewer-coordinates');
const mapZoneCount = document.getElementById('map-zone-count');
const mapAreaCount = document.getElementById('map-area-count');
const mapFocusHint = document.getElementById('map-focus-hint');
const mapManagementTitle = document.getElementById('map-management-area-title');
const mapManagementName = document.getElementById('map-management-area-name');
const mapManagementSpecies = document.getElementById('map-management-area-species');
const mapManagementCoord1 = document.getElementById('map-management-coord-1');
const mapManagementCoord2 = document.getElementById('map-management-coord-2');
const mapManagementCoord3 = document.getElementById('map-management-coord-3');
const mapManagementLat = document.getElementById('map-management-lat');
const mapManagementLng = document.getElementById('map-management-lng');
const mapManagementElev = document.getElementById('map-management-elev');
const mapManagementNotes = document.getElementById('map-management-notes');
const mapManagementOverlay = document.getElementById('map-management-overlay');
const mapManagementOverlayClosers = Array.from(document.querySelectorAll('[data-close-management-overlay]'));
const mapControlButtons = Array.from(document.querySelectorAll('[data-map-target][data-map-action]'));

const zonePalette = ['#154212', '#4b6c8e', '#2d5d49', '#7a5a2d', '#6f4b86'];
const defaultCenter = [65.8425, -23.4891];

const geometryState = {
  ranchBoundary: null,
  zones: [],
  center: defaultCenter,
};

const mapInstances = {
  viewer: null,
  management: null,
};

const zoneLayerRegistry = {
  viewer: new Map(),
  management: new Map(),
};

let selectedViewerZoneId = null;
let selectedManagementZoneId = null;
let prototypeManagementZoneId = null;

function createSlug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeRing(points) {
  if (points.length < 2) {
    return points;
  }

  const [firstLat, firstLng] = points[0];
  const [lastLat, lastLng] = points[points.length - 1];

  if (firstLat === lastLat && firstLng === lastLng) {
    return points.slice(0, -1);
  }

  return points;
}

function parseKmlCoordinates(text) {
  return normalizeRing(
    text
      .trim()
      .split(/\s+/)
      .map((chunk) => {
        const [lng, lat] = chunk.split(',').map(Number);
        return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
      })
      .filter(Boolean),
  );
}

function parseKmlPlacemarks(text) {
  const xml = new window.DOMParser().parseFromString(text, 'application/xml');
  const parserError = xml.querySelector('parsererror');

  if (parserError) {
    throw new Error('Unable to parse KML');
  }

  return Array.from(xml.getElementsByTagNameNS('*', 'Placemark'))
    .map((placemark, index) => {
      const name = placemark.getElementsByTagNameNS('*', 'name')[0]?.textContent?.trim() || `Feature ${index + 1}`;
      const coordinatesText = placemark.getElementsByTagNameNS('*', 'coordinates')[0]?.textContent || '';
      const polygon = parseKmlCoordinates(coordinatesText);

      return {
        id: createSlug(name) || `feature-${index + 1}`,
        name,
        polygon,
      };
    })
    .filter((feature) => feature.polygon.length >= 3);
}

function getPolygonCentroid(polygon) {
  if (!polygon.length) {
    return defaultCenter;
  }

  const total = polygon.reduce(
    (acc, [lat, lng]) => {
      acc.lat += lat;
      acc.lng += lng;
      return acc;
    },
    { lat: 0, lng: 0 },
  );

  return [total.lat / polygon.length, total.lng / polygon.length];
}

function formatHemisphere(value, positive, negative) {
  return `${Math.abs(value).toFixed(4)}° ${value >= 0 ? positive : negative}`;
}

function formatLatLng(latlng) {
  return `${formatHemisphere(latlng.lat, 'N', 'S')}, ${formatHemisphere(latlng.lng, 'E', 'W')}`;
}

function updateMapText(el, value) {
  if (el) {
    el.innerHTML = value;
  }
}

function closeAreaDetails() {
  if (mapAreaOverlay) {
    mapAreaOverlay.hidden = true;
  }
}

function openAreaDetails(zoneId) {
  selectedViewerZoneId = zoneId;
  syncZoneSelection('viewer');
  updateMapSummary();

  if (mapAreaOverlay) {
    mapAreaOverlay.hidden = false;
  }
}

function closeManagementOverlay() {
  if (mapManagementOverlay) {
    mapManagementOverlay.hidden = true;
  }
}

function closeMapTaskModal() {
  if (!mapTaskModal) {
    return;
  }

  mapTaskModal.hidden = true;
  body.classList.remove('modal-open');
}

function openMapTaskModal() {
  if (!mapTaskModal) {
    return;
  }

  mapTaskModal.hidden = false;
  body.classList.add('modal-open');
}

function closeSpeciesDetail() {
  if (!speciesPage || !speciesDetailPanel) {
    return;
  }

  speciesPage.classList.remove('species-detail-open');
  speciesDetailPanel.hidden = true;
  speciesDetailOpeners.forEach((item) => {
    item.setAttribute('aria-expanded', 'false');
  });
}

function openSpeciesDetail() {
  if (!speciesPage || !speciesDetailPanel) {
    return;
  }

  speciesPage.classList.add('species-detail-open');
  speciesDetailPanel.hidden = false;
  speciesDetailOpeners.forEach((item) => {
    item.setAttribute('aria-expanded', 'true');
  });
}

function updateViewerCoordinates(latlng) {
  updateMapText(mapViewerCoordinates, formatLatLng(latlng));
}

function updateManagementStatus(latlng) {
  updateMapText(mapManagementLat, formatHemisphere(latlng.lat, 'N', 'S'));
  updateMapText(mapManagementLng, formatHemisphere(latlng.lng, 'E', 'W'));
}

function getZoneById(zoneId) {
  return geometryState.zones.find((zone) => zone.id === zoneId) || null;
}

function updateMapSummary() {
  if (mapZoneCount) {
    mapZoneCount.textContent = `${geometryState.zones.length} Zones`;
  }

  if (mapAreaCount) {
    mapAreaCount.textContent = geometryState.ranchBoundary ? '1 Ranch' : 'No Ranch';
  }

  if (mapFocusHint) {
    if (!geometryState.ranchBoundary || !geometryState.zones.length) {
      mapFocusHint.textContent = 'KML geometry could not be loaded.';
    } else if (selectedViewerZoneId) {
      const zone = getZoneById(selectedViewerZoneId);
      mapFocusHint.textContent = zone
        ? zone.id === prototypeManagementZoneId
          ? `Focused on ${zone.name}. The prototype info card is open for this zone.`
          : `Focused on ${zone.name}. Ranch and zone boundaries are loaded from the provided KML files.`
        : 'Showing ranch boundary and real zone geometry from KML.';
    } else {
      mapFocusHint.textContent = 'Showing ranch boundary and real zone geometry from KML. Click Zone 3 to open the prototype info card.';
    }
  }
}

function getZoneStyle(zone, selected, variant) {
  const baseColor = zone.color;

  if (variant === 'management') {
    return {
      color: selected ? '#154212' : baseColor,
      weight: selected ? 4 : 2.8,
      fillColor: selected ? '#bcf0ae' : '#ffffff',
      fillOpacity: selected ? 0.16 : 0.03,
    };
  }

  return {
    color: selected ? '#154212' : baseColor,
    weight: selected ? 4 : 3,
    fillColor: selected ? '#d8f1cf' : '#ffffff',
    fillOpacity: selected ? 0.12 : 0.02,
  };
}

function syncZoneSelection(mapKey) {
  const selectedId = mapKey === 'viewer' ? selectedViewerZoneId : selectedManagementZoneId;

  zoneLayerRegistry[mapKey].forEach(({ zone, layer }) => {
    layer.setStyle(getZoneStyle(zone, zone.id === selectedId, mapKey));

    if (zone.id === selectedId) {
      layer.bringToFront();
    }
  });
}

function updateManagementPanel(zoneId) {
  const zone = getZoneById(zoneId);

  if (!zone) {
    return;
  }

  selectedManagementZoneId = zone.id;
  syncZoneSelection('management');

  updateMapText(mapManagementTitle, zone.name);
  updateMapText(mapManagementName, zone.name);
  updateMapText(mapManagementSpecies, 'Internal areas not loaded');
  updateMapText(mapManagementElev, 'KML Boundary');
  updateMapText(mapManagementNotes, 'Zone boundaries loaded from KML. Internal area polygons have not been provided yet.');

  const p1 = zone.polygon[0];
  const p2 = zone.polygon[1] || zone.polygon[0];
  const p3 = zone.polygon[2] || zone.polygon[0];

  updateMapText(mapManagementCoord1, `P1: ${formatLatLng({ lat: p1[0], lng: p1[1] })}`);
  updateMapText(mapManagementCoord2, `P2: ${formatLatLng({ lat: p2[0], lng: p2[1] })}`);
  updateMapText(mapManagementCoord3, `P3: ${formatLatLng({ lat: p3[0], lng: p3[1] })}`);
}

function openManagementOverlay(zoneId) {
  updateManagementPanel(zoneId);

  if (mapManagementOverlay) {
    mapManagementOverlay.hidden = false;
  }
}

function getGeometryBounds() {
  const points = [];

  if (geometryState.ranchBoundary?.polygon) {
    points.push(...geometryState.ranchBoundary.polygon);
  }

  geometryState.zones.forEach((zone) => {
    points.push(...zone.polygon);
  });

  if (!points.length || !window.L) {
    return null;
  }

  return window.L.latLngBounds(points.map(([lat, lng]) => [lat, lng]));
}

function fitMapToGeometry(map) {
  const bounds = getGeometryBounds();

  if (!bounds) {
    map.setView(geometryState.center, 13);
    return;
  }

  map.fitBounds(bounds.pad(0.08), {
    animate: false,
    padding: [40, 40],
    maxZoom: 13.8,
  });
}

function addGeometryLayers(map, mapKey) {
  if (geometryState.ranchBoundary?.polygon) {
    window.L.polygon(geometryState.ranchBoundary.polygon, {
      pane: 'ranch',
      color: '#0d3a29',
      weight: 2.4,
      dashArray: '10 8',
      fillOpacity: 0,
      interactive: false,
    }).addTo(map);
  }

  geometryState.zones.forEach((zone) => {
    const isSelected = mapKey === 'management' ? zone.id === selectedManagementZoneId : zone.id === selectedViewerZoneId;
    const layer = window.L.polygon(zone.polygon, {
      pane: 'zones',
      ...getZoneStyle(zone, isSelected, mapKey),
      interactive: true,
      bubblingMouseEvents: false,
    }).addTo(map);

    layer.bindTooltip(zone.name, {
      permanent: true,
      direction: 'center',
      className: 'leaflet-map-label leaflet-map-label-zone',
      opacity: 1,
    });

    if (mapKey === 'viewer') {
      layer.on('click', () => {
        if (zone.id === prototypeManagementZoneId) {
          openAreaDetails(zone.id);
          return;
        }

        closeAreaDetails();
        selectedViewerZoneId = zone.id;
        syncZoneSelection('viewer');
        updateMapSummary();
      });
    } else {
      layer.on('click', () => {
        if (zone.id === prototypeManagementZoneId) {
          openManagementOverlay(zone.id);
        }
      });
    }

    zoneLayerRegistry[mapKey].set(zone.id, { zone, layer });
  });
}

function createBaseTileLayer() {
  return window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    subdomains: 'abc',
    keepBuffer: 1,
    updateWhenZooming: false,
    updateWhenIdle: true,
    attribution: '&copy; OpenStreetMap contributors',
  });
}

function initViewerMap() {
  if (mapInstances.viewer || !window.L) {
    return;
  }

  const container = document.getElementById('map-viewer-live-map');
  if (!container) {
    return;
  }

  const map = window.L.map(container, {
    zoomControl: false,
    attributionControl: true,
    scrollWheelZoom: true,
    preferCanvas: false,
    zoomAnimation: false,
    fadeAnimation: false,
    markerZoomAnimation: false,
    inertia: false,
  });

  mapInstances.viewer = map;
  createBaseTileLayer().addTo(map);

  map.createPane('ranch');
  map.getPane('ranch').style.zIndex = 420;
  map.createPane('zones');
  map.getPane('zones').style.zIndex = 430;

  addGeometryLayers(map, 'viewer');
  fitMapToGeometry(map);
  updateViewerCoordinates(map.getCenter());
  map.on('moveend', () => updateViewerCoordinates(map.getCenter()));
}

function initManagementMap() {
  if (mapInstances.management || !window.L) {
    return;
  }

  const container = document.getElementById('map-management-live-map');
  if (!container) {
    return;
  }

  const map = window.L.map(container, {
    zoomControl: false,
    attributionControl: false,
    scrollWheelZoom: true,
    preferCanvas: false,
    zoomAnimation: false,
    fadeAnimation: false,
    markerZoomAnimation: false,
    inertia: false,
  });

  mapInstances.management = map;
  createBaseTileLayer().addTo(map);

  map.createPane('ranch');
  map.getPane('ranch').style.zIndex = 420;
  map.createPane('zones');
  map.getPane('zones').style.zIndex = 430;

  addGeometryLayers(map, 'management');
  fitMapToGeometry(map);
  updateManagementStatus(map.getCenter());

  if (selectedManagementZoneId) {
    updateManagementPanel(selectedManagementZoneId);
  }

  map.on('moveend', () => updateManagementStatus(map.getCenter()));
}

function ensureLiveMap(viewId) {
  if (viewId === 'map-viewer') {
    initViewerMap();
  }

  if (viewId === 'map-management') {
    initManagementMap();
  }

  const map = viewId === 'map-viewer' ? mapInstances.viewer : viewId === 'map-management' ? mapInstances.management : null;

  if (map) {
    window.setTimeout(() => {
      map.invalidateSize(false);
      fitMapToGeometry(map);
    }, 80);
  }
}

function handleMapAction(target, action) {
  const map = mapInstances[target];

  if (!map) {
    return;
  }

  if (action === 'zoom-in') {
    map.zoomIn();
  }

  if (action === 'zoom-out') {
    map.zoomOut();
  }

  if (action === 'reset') {
    fitMapToGeometry(map);
  }
}

function activateView(viewId, title) {
  const sidebarViewId = sidebarViewMap[viewId] || viewId;
  const utilityViewId = utilityViewMap[viewId] || viewId;

  views.forEach((view) => {
    view.classList.toggle('is-active', view.id === `view-${viewId}`);
  });

  navItems.forEach((item) => {
    const isSidebarNav = item.classList.contains('nav-item');
    const isUtilityNav = item.classList.contains('utility-link');
    const isSettingsTab = item.classList.contains('settings-page-tab');
    if (isSidebarNav) {
      item.classList.toggle('is-active', item.dataset.view === sidebarViewId);
    }
    if (isUtilityNav) {
      item.classList.toggle('is-active', item.dataset.view === utilityViewId);
    }
    if (isSettingsTab) {
      item.classList.toggle('is-active', item.dataset.view === viewId);
    }
  });

  body.classList.toggle('contemporary-mode', contemporaryViews.has(viewId));
  body.classList.remove('phase-wizard-focus-mode');
  closeSpeciesDetail();
  closeAreaDetails();
  closeManagementOverlay();
  closeMapTaskModal();
  pageTitle.textContent = title;
  window.location.hash = viewId;
  window.scrollTo({ top: 0, behavior: 'auto' });
  ensureLiveMap(viewId);
}

async function fetchKml(url) {
  const response = await window.fetch(url, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Failed to load ${url}`);
  }

  return response.text();
}

async function hydrateGeometryFromKml() {
  const [ranchText, zonesText] = await Promise.all([
    fetchKml('/ranch%20coordinates.kml'),
    fetchKml('/zones.kml'),
  ]);

  const ranchFeatures = parseKmlPlacemarks(ranchText);
  const zoneFeatures = parseKmlPlacemarks(zonesText);

  if (!ranchFeatures.length || !zoneFeatures.length) {
    throw new Error('KML data missing placemarks');
  }

  geometryState.ranchBoundary = {
    id: ranchFeatures[0].id,
    name: ranchFeatures[0].name,
    polygon: ranchFeatures[0].polygon,
  };

  geometryState.zones = zoneFeatures.map((feature, index) => ({
    id: createSlug(feature.name) || `zone-${index + 1}`,
    name: feature.name,
    color: zonePalette[index % zonePalette.length],
    polygon: feature.polygon,
  }));

  geometryState.center = getPolygonCentroid(geometryState.ranchBoundary.polygon);
  prototypeManagementZoneId = geometryState.zones.find((zone) => zone.name === 'Zone 3')?.id || geometryState.zones[0]?.id || null;
  selectedManagementZoneId = prototypeManagementZoneId;
  selectedViewerZoneId = null;
  updateMapSummary();
}

function attachListeners() {
  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      const viewId = item.dataset.view;
      const title = item.dataset.title || item.textContent.trim();
      activateView(viewId, title);
    });
  });

  mapControlButtons.forEach((button) => {
    button.addEventListener('click', () => {
      handleMapAction(button.dataset.mapTarget, button.dataset.mapAction);
    });
  });

  mapTaskOpeners.forEach((button) => {
    button.addEventListener('click', () => {
      openMapTaskModal();
    });
  });

  mapTaskClosers.forEach((button) => {
    button.addEventListener('click', () => {
      closeMapTaskModal();
    });
  });

  speciesDetailOpeners.forEach((button) => {
    button.addEventListener('click', () => {
      openSpeciesDetail();
    });
  });

  mapAreaCloseButtons.forEach((button) => {
    button.addEventListener('click', () => {
      closeAreaDetails();
    });
  });

  mapManagementOverlayClosers.forEach((button) => {
    button.addEventListener('click', () => {
      closeManagementOverlay();
    });
  });

  document.addEventListener('click', (event) => {
    const openTaskButton = event.target.closest('[data-open-map-task]');
    if (openTaskButton) {
      openMapTaskModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMapTaskModal();
      closeAreaDetails();
      closeManagementOverlay();
      closeSpeciesDetail();
    }
  });
}

async function initializePrototype() {
  attachListeners();
  updateMapSummary();

  try {
    await hydrateGeometryFromKml();
  } catch (error) {
    console.error('Failed to load KML geometry.', error);
    updateMapSummary();
  }

  const initial = window.location.hash.replace('#', '');

  if (initial && document.getElementById(`view-${initial}`)) {
    const match = navItems.find((item) => item.dataset.view === initial);
    activateView(initial, match?.dataset.title || 'Dashboard');
  } else {
    body.classList.add('contemporary-mode');
    pageTitle.textContent = 'Dashboard';
  }
}

initializePrototype();
