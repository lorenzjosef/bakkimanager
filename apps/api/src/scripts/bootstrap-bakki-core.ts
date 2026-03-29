import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { BakkiCoreBootstrapRunResult } from '@bakki/domain';
import { AppModule } from '../app.module';
import { BakkiAreaMetricsService } from '../bakki-core/bakki-area-metrics.service';
import { BakkiCoreService } from '../bakki-core/bakki-core.service';
import { BakkiGeometryService } from '../bakki-core/bakki-geometry.service';
import { BakkiSpeciesService } from '../bakki-core/bakki-species.service';
import { BakkiTaskTemplateService } from '../bakki-core/bakki-task-template.service';

async function main() {
  const args = new Set(process.argv.slice(2));
  const json = args.has('--json');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const bakkiCore = app.get(BakkiCoreService);
    const bakkiAreaMetrics = app.get(BakkiAreaMetricsService);
    const bakkiGeometry = app.get(BakkiGeometryService);
    const bakkiSpecies = app.get(BakkiSpeciesService);
    const bakkiTaskTemplates = app.get(BakkiTaskTemplateService);

    const geometrySeed = bakkiGeometry.getSeedValidationStatus();
    const migrationResult = await bakkiCore.runMigrations();
    let result: BakkiCoreBootstrapRunResult;

    if (!migrationResult.configured) {
      result = {
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        configured: false,
        geometryPersistence: await bakkiGeometry.getPersistedGeometryCounts(),
        geometrySeed,
        appliedMigrations: [],
        skippedMigrations: [],
        seededZoneCount: 0,
        seededAreaMetricsCount: 0,
        seededTaskTemplateCount: 0,
        seededSpeciesCount: 0,
        message: migrationResult.message,
      };
    } else {
      await bakkiGeometry.ensureAreaCatalog();
      await bakkiGeometry.promoteSeedGeometry();
      const persistedZoneRefs = await bakkiGeometry.listPersistedZoneRefs();
      const geometryPersistence = await bakkiGeometry.getPersistedGeometryCounts();
      await bakkiTaskTemplates.ensureSchema();
      const templates = await bakkiTaskTemplates.listActive();
      const species = await bakkiSpecies.listSpecies();
      const areaMetrics = await bakkiAreaMetrics.listByZoneRefs(persistedZoneRefs);

      result = {
        startedAt: new Date().toISOString(),
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
            ? buildBootstrapMessage(geometrySeed, 'Bakki Core bootstrap completed: migrations ran and seed data was ensured.')
            : buildBootstrapMessage(geometrySeed, 'Bakki Core bootstrap completed: schema was already current and seed data was ensured.'),
      };
    }

    if (json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(`Bakki Core configured: ${result.configured ? 'yes' : 'no'}`);
    console.log(`Message: ${result.message}`);
    console.log(`Applied migrations: ${result.appliedMigrations.length}`);
    console.log(`Skipped migrations: ${result.skippedMigrations.length}`);
    console.log(`Persisted ranches: ${result.geometryPersistence.ranchCount}`);
    console.log(`Seeded zones: ${result.seededZoneCount}`);
    console.log(`Persisted zones: ${result.geometryPersistence.zoneCount}`);
    console.log(`Persisted areas: ${result.geometryPersistence.areaCount}`);
    console.log(`Seeded area metrics: ${result.seededAreaMetricsCount}`);
    console.log(`Seeded task templates: ${result.seededTaskTemplateCount}`);
    console.log(`Seeded species: ${result.seededSpeciesCount}`);
    console.log(`Geometry seed promotable: ${result.geometrySeed.promotable ? 'yes' : 'no'}`);
    if (!result.geometrySeed.promotable) {
      console.log(`Containment failures: ${result.geometrySeed.containmentFailures.join(', ') || 'none'}`);
      console.log(
        `Overlap pairs: ${
          result.geometrySeed.overlapPairs.map(([left, right]) => `${left}/${right}`).join(', ') || 'none'
        }`,
      );
    }
  } finally {
    await app.close();
  }
}

function buildBootstrapMessage(
  geometrySeed: BakkiCoreBootstrapRunResult['geometrySeed'],
  prefix: string,
) {
  if (geometrySeed.promotable) {
    return prefix;
  }

  return `${prefix} Geometry seed is not promotable yet; current ranch/zone validation still reports containment or overlap failures.`;
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Bakki Core bootstrap failed: ${message}`);
  process.exitCode = 1;
});
