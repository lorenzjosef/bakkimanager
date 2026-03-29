import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveOdooServiceSecretSource } from './odoo-config';

test('resolveOdooServiceSecretSource prefers environment configuration when present', async () => {
  const previousPassword = process.env.ODOO_PASSWORD;
  const previousApiKey = process.env.ODOO_API_KEY;

  process.env.ODOO_PASSWORD = 'secret-from-env';
  process.env.ODOO_API_KEY = '';

  try {
    assert.equal(resolveOdooServiceSecretSource(), 'environment');
  } finally {
    if (previousPassword === undefined) {
      delete process.env.ODOO_PASSWORD;
    } else {
      process.env.ODOO_PASSWORD = previousPassword;
    }

    if (previousApiKey === undefined) {
      delete process.env.ODOO_API_KEY;
    } else {
      process.env.ODOO_API_KEY = previousApiKey;
    }
  }
});
