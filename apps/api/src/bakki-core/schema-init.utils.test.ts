import assert from 'node:assert/strict';
import test from 'node:test';
import { ensureSchemaInitialized } from './schema-init.utils';

test('ensureSchemaInitialized runs initialization only once for concurrent callers', async () => {
  let schemaEnsured = false;
  let schemaInitPromise: Promise<void> | null = null;
  let initializeCalls = 0;

  const initialize = async () => {
    initializeCalls += 1;
    await new Promise((resolve) => setTimeout(resolve, 5));
    schemaEnsured = true;
  };

  await Promise.all([
    ensureSchemaInitialized({
      getSchemaInitPromise: () => schemaInitPromise,
      initialize,
      isConfigured: true,
      schemaEnsured,
      setSchemaInitPromise: (promise) => {
        schemaInitPromise = promise;
      },
    }),
    ensureSchemaInitialized({
      getSchemaInitPromise: () => schemaInitPromise,
      initialize,
      isConfigured: true,
      schemaEnsured,
      setSchemaInitPromise: (promise) => {
        schemaInitPromise = promise;
      },
    }),
  ]);

  assert.equal(initializeCalls, 1);
  assert.equal(schemaEnsured, true);
});

test('ensureSchemaInitialized clears the tracked promise after a failed initialization attempt', async () => {
  let schemaInitPromise: Promise<void> | null = null;
  let initializeCalls = 0;

  const initialize = async () => {
    initializeCalls += 1;
    throw new Error('boom');
  };

  await assert.rejects(
    ensureSchemaInitialized({
      getSchemaInitPromise: () => schemaInitPromise,
      initialize,
      isConfigured: true,
      schemaEnsured: false,
      setSchemaInitPromise: (promise) => {
        schemaInitPromise = promise;
      },
    }),
    /boom/,
  );

  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(schemaInitPromise, null);
  assert.equal(initializeCalls, 1);
});
