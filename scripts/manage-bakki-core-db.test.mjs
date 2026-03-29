import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';

import {
  COMPOSE_FILE,
  buildComposeArgs,
  createDbReport,
  getDbActionBlockers,
  getDbPrerequisiteBlockers,
  getDbDoctorBlockers,
  isLocalDbTarget,
  parseEnvFileContents,
  probeDbReachability,
  resolveDbTarget,
  selectEnvFile,
} from './manage-bakki-core-db-lib.mjs';

test('selectEnvFile prefers .env.local when both env files exist', () => {
  const existing = new Set(['/repo/.env.local', '/repo/.env']);

  const selected = selectEnvFile('/repo', (path) => existing.has(path));

  assert.equal(selected, '.env.local');
});

test('selectEnvFile falls back to .env when .env.local is absent', () => {
  const existing = new Set(['/repo/.env']);

  const selected = selectEnvFile('/repo', (path) => existing.has(path));

  assert.equal(selected, '.env');
});

test('buildComposeArgs includes the env file, compose file, and requested action', () => {
  assert.deepEqual(
    buildComposeArgs({
      envFile: '.env.local',
      composeBaseArgs: ['compose'],
      action: ['up', '-d'],
    }),
    ['compose', '--env-file', '.env.local', '-f', COMPOSE_FILE, 'up', '-d'],
  );
});

test('isLocalDbTarget detects loopback endpoints as local targets', () => {
  assert.equal(isLocalDbTarget({ host: '127.0.0.1' }), true);
  assert.equal(isLocalDbTarget({ host: 'localhost' }), true);
  assert.equal(isLocalDbTarget({ host: 'db.internal' }), false);
});

test('getDbPrerequisiteBlockers reports only missing env file', () => {
  assert.deepEqual(getDbPrerequisiteBlockers({ envFile: null }).map((blocker) => blocker.id), [
    'env-file-missing',
  ]);
});

test('getDbPrerequisiteBlockers returns no blockers when env file is present', () => {
  assert.deepEqual(getDbPrerequisiteBlockers({ envFile: '.env.local' }), []);
});

test('parseEnvFileContents reads simple key-value pairs and strips quotes', () => {
  assert.deepEqual(
    parseEnvFileContents(`
      # comment
      BAKKI_CORE_DB_HOST=127.0.0.1
      BAKKI_CORE_DB_NAME="bakki_core"
      BAKKI_CORE_DB_USER='postgres'
    `),
    {
      BAKKI_CORE_DB_HOST: '127.0.0.1',
      BAKKI_CORE_DB_NAME: 'bakki_core',
      BAKKI_CORE_DB_USER: 'postgres',
    },
  );
});

test('resolveDbTarget uses discrete field config when password is present', () => {
  const target = resolveDbTarget({
    BAKKI_CORE_DB_HOST: '127.0.0.1',
    BAKKI_CORE_DB_PORT: '5432',
    BAKKI_CORE_DB_NAME: 'bakki_core',
    BAKKI_CORE_DB_USER: 'postgres',
    BAKKI_CORE_DB_PASSWORD: 'postgres',
  });

  assert.deepEqual(target, {
    configured: true,
    connectionMode: 'field_set',
    host: '127.0.0.1',
    port: 5432,
    database: 'bakki_core',
    user: 'postgres',
    parseError: null,
  });
});

test('resolveDbTarget parses a PostgreSQL connection string', () => {
  const target = resolveDbTarget({
    BAKKI_CORE_DATABASE_URL: 'postgres://postgres:postgres@db.internal:5439/bakki_core',
  });

  assert.deepEqual(target, {
    configured: true,
    connectionMode: 'connection_string',
    host: 'db.internal',
    port: 5439,
    database: 'bakki_core',
    user: 'postgres',
    parseError: null,
  });
});

test('createDbReport prefers env file values for DB target resolution', () => {
  const report = createDbReport({
    cwd: '/repo',
    containerTool: { name: 'docker', composeBaseArgs: ['compose'], displayCommand: 'docker compose' },
    env: {},
    exists: (path) => path === '/repo/.env.local',
    readFile: () => 'BAKKI_CORE_DB_HOST=127.0.0.1\nBAKKI_CORE_DB_PASSWORD=postgres\n',
  });

  assert.equal(report.envFile, '.env.local');
  assert.equal(report.dbTarget.label, 'postgres@127.0.0.1:5432/bakki_core');
  assert.equal(report.dbTarget.connectionMode, 'field_set');
  assert.equal(report.targetScope, 'local');
});

test('getDbDoctorBlockers adds missing-config blocker when DB runtime config is incomplete', () => {
  const blockers = getDbDoctorBlockers({
    blockers: [],
    containerTool: { name: 'docker', composeBaseArgs: ['compose'], displayCommand: 'docker compose' },
    dbTarget: resolveDbTarget({}),
    reachability: null,
    targetScope: 'local',
  });

  assert.equal(blockers.at(-1)?.id, 'db-config-missing');
});

test('getDbDoctorBlockers skips docker blocker for remote targets', () => {
  const blockers = getDbDoctorBlockers({
    blockers: [],
    containerTool: null,
    dbTarget: resolveDbTarget({
      BAKKI_CORE_DATABASE_URL: 'postgres://postgres:postgres@db.internal:5432/bakki_core',
    }),
    reachability: {
      checked: true,
      reachable: false,
      message: 'connect ECONNREFUSED db.internal:5432',
    },
    targetScope: 'remote',
  });

  assert.deepEqual(blockers.map((blocker) => blocker.id), ['db-target-unreachable']);
});

test('getDbDoctorBlockers adds unreachable-target blocker when TCP probe fails', () => {
  const blockers = getDbDoctorBlockers({
    blockers: [],
    containerTool: null,
    dbTarget: resolveDbTarget({
      BAKKI_CORE_DB_HOST: '127.0.0.1',
      BAKKI_CORE_DB_PORT: '5432',
      BAKKI_CORE_DB_PASSWORD: 'postgres',
    }),
    reachability: {
      checked: true,
      reachable: false,
      message: 'connect ECONNREFUSED 127.0.0.1:5432',
    },
    targetScope: 'local',
  });

  assert.deepEqual(blockers.map((blocker) => blocker.id), ['docker-missing', 'db-target-unreachable']);
});

test('getDbActionBlockers prevents local stack commands against remote DB targets', () => {
  const blockers = getDbActionBlockers({
    blockers: [],
    containerTool: null,
    targetScope: 'remote',
    dbTarget: {
      label: 'postgres@db.internal:5432/bakki_core',
    },
  });

  assert.deepEqual(blockers.map((blocker) => blocker.id), ['db-target-remote']);
});

test('probeDbReachability reports success against a live TCP server', async () => {
  const server = net.createServer();

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');

  try {
    const result = await probeDbReachability({
      host: '127.0.0.1',
      port: address.port,
      parseError: null,
    });

    assert.equal(result.checked, true);
    assert.equal(result.reachable, true);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
});

test('probeDbReachability reports connection failure for an unused port', async () => {
  const result = await probeDbReachability({
    host: '127.0.0.1',
    port: 1,
    parseError: null,
  }, 50);

  assert.equal(result.checked, true);
  assert.equal(result.reachable, false);
});
