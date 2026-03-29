#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');

function readNumber(value, fallback) {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveConfig() {
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

function createPool(config) {
  if (config.connectionString) {
    return new Pool({
      connectionString: config.connectionString,
      ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
    });
  }

  if (!config.password) {
    return null;
  }

  return new Pool({
    database: config.database,
    host: config.host,
    password: config.password,
    port: config.port,
    ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
    user: config.user,
  });
}

function loadMigrations() {
  const dir = path.resolve(process.cwd(), 'apps/api/src/bakki-core/migrations');
  return fs.readdirSync(dir)
    .filter((entry) => entry.endsWith('.sql'))
    .sort()
    .map((entry) => ({
      id: entry,
      sql: fs.readFileSync(path.join(dir, entry), 'utf8'),
    }));
}

async function ensureMigrationsTable(client) {
  await client.query(`
    create table if not exists bakki_core_schema_migrations (
      id text primary key,
      applied_at timestamptz not null default now()
    )
  `);
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const migrations = loadMigrations();

  if (dryRun) {
    console.log('Bakki Core migration dry run');
    for (const migration of migrations) {
      console.log(`- ${migration.id}`);
    }
    return;
  }

  const pool = createPool(resolveConfig());
  if (!pool) {
    throw new Error('Bakki Core database is not configured. Set BAKKI_CORE_DATABASE_URL or DB host/user/password.');
  }

  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    const existing = await client.query('select id from bakki_core_schema_migrations');
    const applied = new Set(existing.rows.map((row) => row.id));

    for (const migration of migrations) {
      if (applied.has(migration.id)) {
        console.log(`Skipping ${migration.id}`);
        continue;
      }

      console.log(`Applying ${migration.id}`);
      await client.query('begin');
      try {
        await client.query(migration.sql);
        await client.query(
          'insert into bakki_core_schema_migrations (id) values ($1)',
          [migration.id],
        );
        await client.query('commit');
      } catch (error) {
        await client.query('rollback');
        throw error;
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
