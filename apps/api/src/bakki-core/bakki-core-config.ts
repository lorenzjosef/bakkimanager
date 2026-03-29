function readNumber(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export interface BakkiCoreConfig {
  connectionString: string | null;
  database: string;
  host: string;
  password: string | null;
  port: number;
  ssl: boolean;
  user: string;
}

export interface BakkiCoreConfigStatus {
  configured: boolean;
  connectionMode: 'connection_string' | 'field_set' | 'missing';
  database: string | null;
  host: string | null;
  message: string;
  missingFields: string[];
}

export function allowInvalidGeometrySeedPromotion() {
  return (process.env.BAKKI_CORE_ALLOW_INVALID_GEOMETRY_SEED?.trim() || '').toLowerCase() === 'true';
}

export function resolveBakkiCoreConfig(): BakkiCoreConfig {
  const connectionString = process.env.BAKKI_CORE_DATABASE_URL?.trim() || null;

  return {
    connectionString,
    database: process.env.BAKKI_CORE_DB_NAME?.trim() || 'bakki_core',
    host: process.env.BAKKI_CORE_DB_HOST?.trim() || '127.0.0.1',
    password: process.env.BAKKI_CORE_DB_PASSWORD?.trim() || null,
    port: readNumber(process.env.BAKKI_CORE_DB_PORT, 5432),
    ssl: (process.env.BAKKI_CORE_DB_SSL?.trim() || '').toLowerCase() === 'true',
    user: process.env.BAKKI_CORE_DB_USER?.trim() || 'postgres',
  };
}

export function resolveBakkiCoreConfigStatus(): BakkiCoreConfigStatus {
  const connectionString = process.env.BAKKI_CORE_DATABASE_URL?.trim() || null;
  if (connectionString) {
    return {
      configured: true,
      connectionMode: 'connection_string',
      database: null,
      host: null,
      message: 'Bakki Core is configured via BAKKI_CORE_DATABASE_URL.',
      missingFields: [],
    };
  }

  const password = process.env.BAKKI_CORE_DB_PASSWORD?.trim() || null;
  if (password) {
    return {
      configured: true,
      connectionMode: 'field_set',
      database: process.env.BAKKI_CORE_DB_NAME?.trim() || 'bakki_core',
      host: process.env.BAKKI_CORE_DB_HOST?.trim() || '127.0.0.1',
      message: 'Bakki Core is configured via discrete PostgreSQL fields.',
      missingFields: [],
    };
  }

  return {
    configured: false,
    connectionMode: 'missing',
    database: process.env.BAKKI_CORE_DB_NAME?.trim() || 'bakki_core',
    host: process.env.BAKKI_CORE_DB_HOST?.trim() || '127.0.0.1',
    message:
      'Bakki Core is not configured. Set BAKKI_CORE_DATABASE_URL or BAKKI_CORE_DB_PASSWORD with the matching PostgreSQL fields.',
    missingFields: ['BAKKI_CORE_DATABASE_URL', 'BAKKI_CORE_DB_PASSWORD'],
  };
}
