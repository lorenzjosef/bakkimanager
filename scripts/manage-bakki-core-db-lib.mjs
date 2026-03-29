import { existsSync, readFileSync } from 'node:fs';
import net from 'node:net';

export const COMPOSE_FILE = 'infra/platform/docker-compose.local.yml';
export const ENV_FILE_CANDIDATES = ['.env.local', '.env'];

export function selectEnvFile(cwd, exists = existsSync) {
  for (const candidate of ENV_FILE_CANDIDATES) {
    if (exists(`${cwd}/${candidate}`)) {
      return candidate;
    }
  }
  return null;
}

export function buildComposeArgs({ envFile, composeBaseArgs, action }) {
  return [
    ...composeBaseArgs,
    '--env-file',
    envFile,
    '-f',
    COMPOSE_FILE,
    ...action,
  ];
}

export function isLocalDbTarget(dbTarget) {
  const host = dbTarget.host?.trim().toLowerCase();

  if (!host) {
    return true;
  }

  return host === '127.0.0.1' || host === 'localhost' || host === '::1';
}

export function getDbPrerequisiteBlockers({ envFile }) {
  const blockers = [];

  if (!envFile) {
    blockers.push({
      id: 'env-file-missing',
      label: 'No local env file found',
      detail: 'Create .env.local first by running yarn env:init-local.',
    });
  }

  return blockers;
}

function readNumber(value, fallback) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"'))
    || (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

export function parseEnvFileContents(contents) {
  const result = {};

  for (const rawLine of contents.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separator = line.indexOf('=');
    if (separator <= 0) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    const value = stripQuotes(line.slice(separator + 1).trim());
    result[key] = value;
  }

  return result;
}

export function loadEnvFileValues(cwd, envFile, readFile = readFileSync) {
  if (!envFile) {
    return {};
  }

  try {
    return parseEnvFileContents(readFile(`${cwd}/${envFile}`, 'utf8'));
  } catch {
    return {};
  }
}

function describeDbTarget(target) {
  const user = target.user || 'unknown';
  const host = target.host || 'unknown';
  const port = target.port ?? 'unknown';
  const database = target.database || 'unknown';
  return `${user}@${host}:${port}/${database}`;
}

export function resolveDbTarget(env) {
  const defaultTarget = {
    configured: false,
    connectionMode: 'missing',
    host: env.BAKKI_CORE_DB_HOST?.trim() || '127.0.0.1',
    port: readNumber(env.BAKKI_CORE_DB_PORT, 5432),
    database: env.BAKKI_CORE_DB_NAME?.trim() || 'bakki_core',
    user: env.BAKKI_CORE_DB_USER?.trim() || 'postgres',
    parseError: null,
  };

  const connectionString = env.BAKKI_CORE_DATABASE_URL?.trim() || '';
  if (connectionString) {
    try {
      const parsed = new URL(connectionString);
      return {
        configured: true,
        connectionMode: 'connection_string',
        host: parsed.hostname || defaultTarget.host,
        port: readNumber(parsed.port, 5432),
        database: parsed.pathname.replace(/^\//u, '') || defaultTarget.database,
        user: decodeURIComponent(parsed.username || defaultTarget.user),
        parseError: null,
      };
    } catch {
      return {
        configured: true,
        connectionMode: 'connection_string',
        host: null,
        port: null,
        database: null,
        user: null,
        parseError: 'BAKKI_CORE_DATABASE_URL is not a valid PostgreSQL connection string.',
      };
    }
  }

  const password = env.BAKKI_CORE_DB_PASSWORD?.trim() || '';
  if (password) {
    return {
      ...defaultTarget,
      configured: true,
      connectionMode: 'field_set',
    };
  }

  return defaultTarget;
}

export function createDbReport({
  cwd,
  containerTool,
  env = process.env,
  exists = existsSync,
  readFile = readFileSync,
}) {
  const envFile = selectEnvFile(cwd, exists);
  const envFileValues = loadEnvFileValues(cwd, envFile, readFile);
  const mergedEnv = {
    ...envFileValues,
    ...env,
  };
  const dbTarget = resolveDbTarget(mergedEnv);
  const targetScope = isLocalDbTarget(dbTarget) ? 'local' : 'remote';

  return {
    composeFile: COMPOSE_FILE,
    containerTool,
    dbTarget: {
      ...dbTarget,
      label: describeDbTarget(dbTarget),
    },
    envFile,
    ok: false,
    blockers: getDbPrerequisiteBlockers({ envFile }),
    targetScope,
  };
}

export function getDbDoctorBlockers({ blockers, containerTool, dbTarget, reachability, targetScope }) {
  const next = [...blockers];

  if (!containerTool && targetScope === 'local') {
    next.push({
      id: 'docker-missing',
      label: 'Docker is not installed',
      detail: 'Install Docker Desktop or another Docker distribution that provides docker compose to manage the local PostGIS stack.',
    });
  }

  if (dbTarget.parseError) {
    next.push({
      id: 'db-config-invalid',
      label: 'Bakki Core DB config is invalid',
      detail: dbTarget.parseError,
    });
    return next;
  }

  if (!dbTarget.configured) {
    next.push({
      id: 'db-config-missing',
      label: 'Bakki Core DB config is incomplete',
      detail: 'Set BAKKI_CORE_DATABASE_URL or BAKKI_CORE_DB_PASSWORD so the API can connect to PostgreSQL/PostGIS.',
    });
    return next;
  }

  if (reachability?.checked && !reachability.reachable) {
    next.push({
      id: 'db-target-unreachable',
      label: 'Bakki Core DB target is unreachable',
      detail: reachability.message,
    });
  }

  return next;
}

export function getDbActionBlockers({ blockers, containerTool, targetScope, dbTarget }) {
  const next = [...blockers];

  if (targetScope === 'remote') {
    next.push({
      id: 'db-target-remote',
      label: 'Bakki Core DB target is remote',
      detail: `The local Docker stack only manages local PostGIS. Current Bakki Core target is ${dbTarget.label}. Use provider tooling for that database.`,
    });
    return next;
  }

  if (!containerTool) {
    next.push({
      id: 'docker-missing',
      label: 'Docker is not installed',
      detail: 'Install Docker Desktop or another Docker distribution that provides docker compose.',
    });
  }

  return next;
}

export function probeDbReachability(target, timeoutMs = 1000) {
  if (!target.host || !target.port || target.parseError) {
    return Promise.resolve({
      checked: false,
      reachable: false,
      message: 'Bakki Core DB target is unavailable until the runtime config is valid.',
    });
  }

  return new Promise((resolve) => {
    const socket = net.createConnection({
      host: target.host,
      port: target.port,
    });

    const finish = (result) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      finish({
        checked: true,
        reachable: true,
        message: `Connected to ${target.host}:${target.port}.`,
      });
    });
    socket.once('timeout', () => {
      finish({
        checked: true,
        reachable: false,
        message: `Timed out connecting to ${target.host}:${target.port}.`,
      });
    });
    socket.once('error', (error) => {
      finish({
        checked: true,
        reachable: false,
        message: error instanceof Error ? error.message : String(error),
      });
    });
  });
}
