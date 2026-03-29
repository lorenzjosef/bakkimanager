import test from 'node:test';
import assert from 'node:assert/strict';
import {
  allowInvalidGeometrySeedPromotion,
  resolveBakkiCoreConfig,
  resolveBakkiCoreConfigStatus,
} from './bakki-core-config';

const ORIGINAL_ENV = { ...process.env };

function restoreEnv() {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) {
      delete process.env[key];
    }
  }

  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    process.env[key] = value;
  }
}

test.afterEach(() => {
  restoreEnv();
});

test('resolveBakkiCoreConfigStatus reports missing configuration by default', () => {
  delete process.env.BAKKI_CORE_DATABASE_URL;
  delete process.env.BAKKI_CORE_DB_PASSWORD;
  delete process.env.BAKKI_CORE_DB_HOST;
  delete process.env.BAKKI_CORE_DB_NAME;

  const status = resolveBakkiCoreConfigStatus();

  assert.equal(status.configured, false);
  assert.equal(status.connectionMode, 'missing');
  assert.equal(status.database, 'bakki_core');
  assert.equal(status.host, '127.0.0.1');
  assert.deepEqual(status.missingFields, ['BAKKI_CORE_DATABASE_URL', 'BAKKI_CORE_DB_PASSWORD']);
});

test('resolveBakkiCoreConfigStatus reports connection-string mode', () => {
  process.env.BAKKI_CORE_DATABASE_URL = 'postgres://user:pass@db.example.com:5432/bakki_core';
  delete process.env.BAKKI_CORE_DB_PASSWORD;

  const status = resolveBakkiCoreConfigStatus();

  assert.equal(status.configured, true);
  assert.equal(status.connectionMode, 'connection_string');
  assert.equal(status.missingFields.length, 0);
});

test('resolveBakkiCoreConfig falls back to discrete fields', () => {
  delete process.env.BAKKI_CORE_DATABASE_URL;
  process.env.BAKKI_CORE_DB_HOST = 'db.internal';
  process.env.BAKKI_CORE_DB_PORT = '5433';
  process.env.BAKKI_CORE_DB_NAME = 'bakki_core_dev';
  process.env.BAKKI_CORE_DB_USER = 'bakki';
  process.env.BAKKI_CORE_DB_PASSWORD = 'secret';
  process.env.BAKKI_CORE_DB_SSL = 'true';

  const config = resolveBakkiCoreConfig();

  assert.equal(config.connectionString, null);
  assert.equal(config.host, 'db.internal');
  assert.equal(config.port, 5433);
  assert.equal(config.database, 'bakki_core_dev');
  assert.equal(config.user, 'bakki');
  assert.equal(config.password, 'secret');
  assert.equal(config.ssl, true);
});

test('allowInvalidGeometrySeedPromotion defaults to false and reads explicit true', () => {
  delete process.env.BAKKI_CORE_ALLOW_INVALID_GEOMETRY_SEED;
  assert.equal(allowInvalidGeometrySeedPromotion(), false);

  process.env.BAKKI_CORE_ALLOW_INVALID_GEOMETRY_SEED = 'true';
  assert.equal(allowInvalidGeometrySeedPromotion(), true);
});
