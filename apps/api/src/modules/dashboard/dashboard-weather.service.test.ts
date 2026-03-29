import assert from 'node:assert/strict';
import test from 'node:test';
import { DashboardWeatherService } from './dashboard-weather.service';

const ORIGINAL_FETCH = globalThis.fetch;

test.afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
});

function createDashboardWeatherService(options?: {
  coordinates?: { latitude: number; longitude: number } | null;
}) {
  const bakkiGeometry = {
    getRanchCentroidCoordinates: async () =>
      options && 'coordinates' in options ? options.coordinates ?? null : { latitude: 63.9, longitude: -21.4 },
  };

  return new DashboardWeatherService(bakkiGeometry as never);
}

test('getCurrentConditions maps Open-Meteo current weather into dashboard strings', async () => {
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        current: {
          temperature_2m: 8.6,
          weather_code: 3,
          wind_speed_10m: 17.8,
          wind_direction_10m: 310,
        },
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )) as typeof fetch;

  const service = createDashboardWeatherService();
  const conditions = await service.getCurrentConditions();

  assert.deepEqual(conditions, {
    conditionsValue: '9C / Overcast',
    conditionsCopy: 'Wind: 18km/h NW',
  });
});

test('getCurrentConditions returns null when ranch coordinates are unavailable', async () => {
  const service = createDashboardWeatherService({ coordinates: null });

  const conditions = await service.getCurrentConditions();

  assert.equal(conditions, null);
});

test('getCurrentConditions returns null when the weather provider responds with an error', async () => {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ error: true }), { status: 502 })) as typeof fetch;

  const service = createDashboardWeatherService();
  const conditions = await service.getCurrentConditions();

  assert.equal(conditions, null);
});

test('getHealthStatus reports a reachable weather feed with rendered dashboard strings', async () => {
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        current: {
          temperature_2m: 8.6,
          weather_code: 3,
          wind_speed_10m: 17.8,
          wind_direction_10m: 310,
        },
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )) as typeof fetch;

  const service = createDashboardWeatherService();
  const health = await service.getHealthStatus();

  assert.equal(health.provider, 'open-meteo');
  assert.equal(health.available, true);
  assert.equal(health.conditionsValue, '9C / Overcast');
  assert.equal(health.conditionsCopy, 'Wind: 18km/h NW');
  assert.equal(health.message, 'Open-Meteo weather feed is reachable.');
});

test('getHealthStatus reports missing centroid coordinates cleanly', async () => {
  const service = createDashboardWeatherService({ coordinates: null });

  const health = await service.getHealthStatus();

  assert.equal(health.available, false);
  assert.equal(health.conditionsValue, null);
  assert.equal(health.message, 'Ranch centroid is unavailable, so the weather feed cannot be checked.');
});
