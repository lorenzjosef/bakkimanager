import { Injectable, UnauthorizedException } from '@nestjs/common';
import type {
  BakkiCoreBootstrapRunResult,
  BakkiCoreMigrationRunResult,
  MediaUploadProbeResult,
  MediaSigningProbeResult,
  OdooMirrorSyncRunResult,
  OdooTaskSyncProvisionResult,
  OdooTaskWriteProbeResult,
  SettingsOdooDiagnostics,
} from '@bakki/domain';
import { BakkiCoreService } from '../../bakki-core/bakki-core.service';
import { BakkiAreaMetricsService } from '../../bakki-core/bakki-area-metrics.service';
import { BakkiGeometryService } from '../../bakki-core/bakki-geometry.service';
import { BakkiTaskMirrorService } from '../../bakki-core/bakki-task-mirror.service';
import { BakkiTaskTemplateService } from '../../bakki-core/bakki-task-template.service';
import { BakkiUserMirrorService } from '../../bakki-core/bakki-user-mirror.service';
import { BakkiSpeciesService } from '../../bakki-core/bakki-species.service';
import { OdooService } from '../../odoo/odoo.service';
import { AuthService } from '../auth/auth.service';
import { MediaService } from '../media/media.service';
import { TasksService } from '../tasks/tasks.service';
import { UsersService } from '../users/users.service';
import { DashboardWeatherService } from '../dashboard/dashboard-weather.service';
import { OdooTaskSyncService } from './odoo-task-sync.service';
import {
  buildBakkiCoreBootstrapMessage,
  buildDeploymentBlockers,
  buildRecommendedActions,
  buildSyncHistory,
  emptyMirrorSummary,
} from './health.service.diagnostics';

@Injectable()
export class HealthService {
  constructor(
    private readonly authService: AuthService,
    private readonly bakkiAreaMetrics: BakkiAreaMetricsService,
    private readonly bakkiCore: BakkiCoreService,
    private readonly bakkiGeometry: BakkiGeometryService,
    private readonly bakkiSpecies: BakkiSpeciesService,
    private readonly bakkiTasks: BakkiTaskMirrorService,
    private readonly bakkiTaskTemplates: BakkiTaskTemplateService,
    private readonly bakkiUsers: BakkiUserMirrorService,
    private readonly dashboardWeather: DashboardWeatherService,
    private readonly mediaService: MediaService,
    private readonly odoo: OdooService,
    private readonly odooTaskSync: OdooTaskSyncService,
    private readonly tasksService: TasksService,
    private readonly usersService: UsersService,
  ) {}

  getHealth() {
    return {
      status: 'ok',
      service: 'bakki-api',
      timestamp: new Date().toISOString(),
    };
  }

  async getOdooDiagnostics(): Promise<SettingsOdooDiagnostics> {
    const checkedAt = new Date().toISOString();
    const [bakkiCore, geometryPersistence, odoo, weather] = await Promise.all([
      this.getBakkiCoreHealth(),
      this.bakkiGeometry.getPersistedGeometryCounts(),
      this.odoo.healthcheck(),
      this.dashboardWeather.getHealthStatus(),
    ]);
    const [users, tasks] = bakkiCore.configured && bakkiCore.ok
      ? await Promise.all([
          this.bakkiUsers.isConfigured()
            ? this.bakkiUsers.getSyncHealthSummary()
            : Promise.resolve(emptyMirrorSummary()),
          this.bakkiTasks.isConfigured()
            ? this.bakkiTasks.getSyncHealthSummary()
            : Promise.resolve(emptyMirrorSummary()),
        ])
      : [emptyMirrorSummary(), emptyMirrorSummary()];
    const geometrySeed = this.bakkiGeometry.getSeedValidationStatus();
    const taskSync = await this.odooTaskSync.getReadiness();

    const media = this.mediaService.getUploadStatus();
    const total = users.total + tasks.total;
    const okCount = users.okCount + tasks.okCount;
    const successRatePercent = total > 0 ? Number(((okCount / total) * 100).toFixed(1)) : null;

    return {
      checkedAt,
      bakkiCore,
      deploymentBlockers: buildDeploymentBlockers({
        bakkiCore,
        geometryPersistence,
        geometrySeed,
        media,
        mirrors: {
          tasks,
          users,
        },
        odoo,
        taskSync,
        weather,
      }),
      geometryPersistence,
      geometrySeed,
      media,
      mirrors: {
        users,
        tasks,
      },
      odoo,
      recommendedActions: buildRecommendedActions({
        bakkiCore,
        geometryPersistence,
        geometrySeed,
        media,
        mirrors: {
          tasks,
          users,
        },
        odoo,
        taskSync,
      }),
      successRatePercent,
      syncHistory: buildSyncHistory({
        bakkiCore,
        checkedAt,
        geometryPersistence,
        geometrySeed,
        media,
        mirrors: {
          tasks,
          users,
        },
        odoo,
        weather,
      }),
      taskSync,
      weather,
    };
  }

  async runOdooSyncNow(sessionToken?: string): Promise<OdooMirrorSyncRunResult> {
    const startedAt = new Date().toISOString();

    if (!this.odoo.isConfigured()) {
      return {
        startedAt,
        completedAt: new Date().toISOString(),
        message: 'Odoo service credentials are not configured.',
        users: { fetched: 0, synced: 0, failed: 0 },
        tasks: { fetched: 0, synced: 0, failed: 0 },
      };
    }

    const { session } = await this.authService.getSession(sessionToken);
    if (!session?.authenticated || session.user.role !== 'owner') {
      throw new UnauthorizedException('Only Bakki owners can trigger Odoo mirror sync.');
    }

    const [users, tasks] = await Promise.all([
      this.usersService.refreshMirrorsFromOdoo(),
      this.tasksService.refreshMirrorsFromOdoo(),
    ]);

    const completedAt = new Date().toISOString();
    const mirrorsConfigured = this.bakkiUsers.isConfigured() && this.bakkiTasks.isConfigured();
    return {
      startedAt,
      completedAt,
      message: !mirrorsConfigured
        ? 'Odoo connectivity is live, but Bakki Core mirrors are not configured in this environment.'
        : users.failed === 0 && tasks.failed === 0
          ? 'Odoo mirror sync completed successfully.'
          : 'Odoo mirror sync completed with partial failures.',
      users,
      tasks,
    };
  }

  async runBakkiCoreMigrations(sessionToken?: string): Promise<BakkiCoreMigrationRunResult> {
    const startedAt = new Date().toISOString();
    const { session } = await this.authService.getSession(sessionToken);
    if (!session?.authenticated || session.user.role !== 'owner') {
      throw new UnauthorizedException('Only Bakki owners can run Bakki Core migrations.');
    }

    const result = await this.bakkiCore.runMigrations();
    return {
      startedAt,
      completedAt: new Date().toISOString(),
      configured: result.configured,
      appliedMigrations: result.appliedMigrations,
      skippedMigrations: result.skippedMigrations,
      message: result.message,
    };
  }

  async runBakkiCoreBootstrap(sessionToken?: string): Promise<BakkiCoreBootstrapRunResult> {
    const startedAt = new Date().toISOString();
    const { session } = await this.authService.getSession(sessionToken);
    if (!session?.authenticated || session.user.role !== 'owner') {
      throw new UnauthorizedException('Only Bakki owners can bootstrap Bakki Core.');
    }

    const geometrySeed = this.bakkiGeometry.getSeedValidationStatus();
    const migrationResult = await this.bakkiCore.runMigrations();
    if (!migrationResult.configured) {
      return {
        startedAt,
        completedAt: new Date().toISOString(),
        configured: false,
        geometryPersistence: await this.bakkiGeometry.getPersistedGeometryCounts(),
        geometrySeed,
        appliedMigrations: [],
        skippedMigrations: [],
        seededZoneCount: 0,
        seededAreaMetricsCount: 0,
        seededTaskTemplateCount: 0,
        seededSpeciesCount: 0,
        message: migrationResult.message,
      };
    }

    await this.bakkiGeometry.ensureAreaCatalog();
    await this.bakkiGeometry.promoteSeedGeometry();
    const persistedZoneRefs = await this.bakkiGeometry.listPersistedZoneRefs();
    const geometryPersistence = await this.bakkiGeometry.getPersistedGeometryCounts();
    await this.bakkiTaskTemplates.ensureSchema();
    const templates = await this.bakkiTaskTemplates.listActive();
    await this.bakkiSpecies.listSpecies();
    const species = await this.bakkiSpecies.listSpecies();
    await this.bakkiAreaMetrics.listByZoneRefs(persistedZoneRefs);
    const areaMetrics = await this.bakkiAreaMetrics.listByZoneRefs(persistedZoneRefs);

    return {
      startedAt,
      completedAt: new Date().toISOString(),
      configured: true,
      geometryPersistence,
      geometrySeed,
      appliedMigrations: migrationResult.appliedMigrations,
      skippedMigrations: migrationResult.skippedMigrations,
      seededZoneCount: persistedZoneRefs.length,
      seededAreaMetricsCount: areaMetrics.length,
      seededTaskTemplateCount: templates.length,
      seededSpeciesCount: species.length,
      message:
        migrationResult.appliedMigrations.length > 0
          ? buildBakkiCoreBootstrapMessage(geometrySeed, 'Bakki Core bootstrap completed: migrations ran and seed data was ensured.')
          : buildBakkiCoreBootstrapMessage(geometrySeed, 'Bakki Core bootstrap completed: schema was already current and seed data was ensured.'),
    };
  }

  async runOdooTaskWriteProbe(sessionToken?: string): Promise<OdooTaskWriteProbeResult> {
    const { session } = await this.authService.getSession(sessionToken);
    if (!session?.authenticated || session.user.role !== 'owner') {
      throw new UnauthorizedException('Only Bakki owners can run the Odoo write probe.');
    }
    return this.odooTaskSync.runWriteProbe();
  }

  async provisionOdooTaskSync(sessionToken?: string): Promise<OdooTaskSyncProvisionResult> {
    const { session } = await this.authService.getSession(sessionToken);
    if (!session?.authenticated || session.user.role !== 'owner') {
      throw new UnauthorizedException('Only Bakki owners can provision Odoo task sync.');
    }
    return this.odooTaskSync.provision();
  }

  async runMediaSigningProbe(sessionToken?: string): Promise<MediaSigningProbeResult> {
    const { session } = await this.authService.getSession(sessionToken);
    if (!session?.authenticated || session.user.role !== 'owner') {
      throw new UnauthorizedException('Only Bakki owners can run the media signing probe.');
    }

    return this.mediaService.createSigningProbe();
  }

  async runMediaUploadProbe(sessionToken?: string): Promise<MediaUploadProbeResult> {
    const { session } = await this.authService.getSession(sessionToken);
    if (!session?.authenticated || session.user.role !== 'owner') {
      throw new UnauthorizedException('Only Bakki owners can run the media upload probe.');
    }

    return this.mediaService.createUploadProbe();
  }

  private async getBakkiCoreHealth(): Promise<SettingsOdooDiagnostics['bakkiCore']> {
    const health = await this.bakkiCore.healthcheck();
    return {
      appliedMigrationCount: health.appliedMigrationCount,
      checkedAt: new Date().toISOString(),
      configured: health.configured,
      connectionMode: health.connectionMode,
      database: health.database,
      host: health.host,
      migrationTablePresent: health.migrationTablePresent,
      message: health.message,
      missingFields: Array.from(health.missingFields),
      ok: health.ok,
      port: health.port,
      postgisAvailable: health.postgisAvailable,
      postgisVersion: health.postgisVersion,
      serverVersion: health.serverVersion,
    };
  }

}
