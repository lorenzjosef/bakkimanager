import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import { resolveBakkiCoreConfig, resolveBakkiCoreConfigStatus } from './bakki-core-config';
import { probeBakkiCoreQueryable } from './bakki-core-probe';

@Injectable()
export class BakkiCoreService implements OnModuleDestroy {
  private readonly logger = new Logger(BakkiCoreService.name);
  private readonly config = resolveBakkiCoreConfig();
  private readonly configStatus = resolveBakkiCoreConfigStatus();
  private readonly pool: Pool | null = this.createPool();

  isConfigured() {
    return this.pool !== null;
  }

  async query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
    if (!this.pool) {
      throw new Error('Bakki Core database is not configured.');
    }

    return this.pool.query<T>(text, params);
  }

  async withClient<T>(callback: (client: PoolClient) => Promise<T>) {
    if (!this.pool) {
      throw new Error('Bakki Core database is not configured.');
    }

    const client = await this.pool.connect();
    try {
      return await callback(client);
    } finally {
      client.release();
    }
  }

  async healthcheck() {
    if (!this.pool) {
      return {
        appliedMigrationCount: null,
        configured: false,
        connectionMode: this.configStatus.connectionMode,
        database: this.configStatus.database,
        host: this.configStatus.host,
        migrationTablePresent: null,
        message: this.configStatus.message,
        missingFields: [...this.configStatus.missingFields],
        ok: false,
        port: this.config.port,
        postgisAvailable: null,
        postgisVersion: null,
        serverVersion: null,
      } as const;
    }

    try {
      const probe = await probeBakkiCoreQueryable(this.pool, {
        database: this.config.database,
        host: this.config.host,
        port: this.config.port,
      });

      return {
        appliedMigrationCount: probe.appliedMigrationCount,
        configured: true,
        connectionMode: this.configStatus.connectionMode,
        database: this.config.database,
        host: this.config.host,
        migrationTablePresent: probe.migrationTablePresent,
        message: 'Bakki Core database connection is healthy.',
        missingFields: [] as string[],
        ok: true,
        port: this.config.port,
        postgisAvailable: probe.postgisAvailable,
        postgisVersion: probe.postgisVersion,
        serverVersion: probe.serverVersion,
      } as const;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Bakki Core connection error';
      this.logger.warn(`Bakki Core healthcheck failed: ${message}`);
      return {
        appliedMigrationCount: null,
        configured: true,
        connectionMode: this.configStatus.connectionMode,
        database: this.config.database,
        host: this.config.host,
        migrationTablePresent: null,
        message,
        missingFields: [] as string[],
        ok: false,
        port: this.config.port,
        postgisAvailable: null,
        postgisVersion: null,
        serverVersion: null,
      } as const;
    }
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
    }
  }

  async runMigrations() {
    if (!this.pool) {
      return {
        configured: false,
        appliedMigrations: [] as string[],
        skippedMigrations: [] as string[],
        message: this.configStatus.message,
      };
    }

    const migrations = await loadMigrations();
    return this.withClient(async (client) => {
      await client.query(`
        create table if not exists bakki_core_schema_migrations (
          id text primary key,
          applied_at timestamptz not null default now()
        )
      `);

      const existing = await client.query<{ id: string }>(
        'select id from bakki_core_schema_migrations order by id asc',
      );
      const applied = new Set(existing.rows.map((row) => row.id));
      const appliedMigrations: string[] = [];
      const skippedMigrations: string[] = [];

      for (const migration of migrations) {
        if (applied.has(migration.id)) {
          skippedMigrations.push(migration.id);
          continue;
        }

        await client.query('begin');
        try {
          await client.query(migration.sql);
          await client.query(
            'insert into bakki_core_schema_migrations (id) values ($1)',
            [migration.id],
          );
          await client.query('commit');
          appliedMigrations.push(migration.id);
        } catch (error) {
          await client.query('rollback');
          throw error;
        }
      }

      return {
        configured: true,
        appliedMigrations,
        skippedMigrations,
        message:
          appliedMigrations.length > 0
            ? `Applied ${appliedMigrations.length} Bakki Core migration${appliedMigrations.length === 1 ? '' : 's'}.`
            : 'Bakki Core schema is already up to date.',
      };
    });
  }

  private createPool() {
    if (this.config.connectionString) {
      return new Pool({
        connectionString: this.config.connectionString,
        ssl: this.config.ssl ? { rejectUnauthorized: false } : undefined,
      });
    }

    if (!this.config.password) {
      this.logger.log('Bakki Core database is not configured yet; using non-persistent fallbacks.');
      return null;
    }

    return new Pool({
      database: this.config.database,
      host: this.config.host,
      password: this.config.password,
      port: this.config.port,
      ssl: this.config.ssl ? { rejectUnauthorized: false } : undefined,
      user: this.config.user,
    });
  }
}

async function loadMigrations() {
  const dir = path.resolve(process.cwd(), 'src/bakki-core/migrations');
  const entries = (await readdir(dir))
    .filter((entry) => entry.endsWith('.sql'))
    .sort();

  return Promise.all(entries.map(async (entry) => ({
    id: entry,
    sql: await readFile(path.join(dir, entry), 'utf8'),
  })));
}
