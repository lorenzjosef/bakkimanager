import type { Logger } from '@nestjs/common';
import type {
  PlantingWizardAreaData,
  PlantingWizardData,
} from '@bakki/domain';
import type { BakkiGeometryService } from '../../bakki-core/bakki-geometry.service';
import type { BakkiPhaseService } from '../../bakki-core/bakki-phase.service';
import type { BakkiUserMirrorService } from '../../bakki-core/bakki-user-mirror.service';
import {
  buildWizardData as buildPlantingWizardData,
  formatHectares,
  mapWizardMember,
} from './phases.service.helpers';

interface PhaseWizardDeps {
  bakkiGeometry: Pick<
    BakkiGeometryService,
    'getAreaGeometryFeatureCollection' | 'listAreas' | 'listZoneSummaries'
  >;
  bakkiPhases: Pick<BakkiPhaseService, 'getLatestContractsByAreaRefs' | 'isConfigured'>;
  bakkiUsers: Pick<BakkiUserMirrorService, 'isConfigured' | 'listUsers'>;
  logger: Pick<Logger, 'warn'>;
}

export async function buildPhaseWizardData(deps: PhaseWizardDeps): Promise<PlantingWizardData> {
  const [areas, members] = await Promise.all([
    listWizardAreas(deps),
    listWizardMembers(deps),
  ]);

  return buildPlantingWizardData(areas, members);
}

async function listWizardMembers(
  deps: PhaseWizardDeps,
): Promise<PlantingWizardData['confirm']['teamMembers']> {
  if (!deps.bakkiUsers.isConfigured()) {
    return [];
  }

  try {
    const users = await deps.bakkiUsers.listUsers();
    return users
      .filter((user) => user.active)
      .slice(0, 12)
      .map((user, index) => mapWizardMember(user, index));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown wizard user bootstrap error';
    deps.logger.warn(`Bakki Core wizard user bootstrap unavailable; returning empty personnel list. ${message}`);
    return [];
  }
}

async function listWizardAreas(deps: PhaseWizardDeps): Promise<PlantingWizardAreaData[]> {
  try {
    const [areasByRef, zones, areaGeoJson] = await Promise.all([
      deps.bakkiGeometry.listAreas(),
      deps.bakkiGeometry.listZoneSummaries(),
      deps.bakkiGeometry.getAreaGeometryFeatureCollection(),
    ]);
    const zoneNameById = new Map(zones.map((zone) => [zone.id, zone.name] as const));
    const hectaresByAreaRef = new Map(
      areaGeoJson.features.map((feature) => [
        feature.properties.areaRef,
        feature.properties.hectaresEstimate ?? null,
      ] as const),
    );
    const areaRefs = [...areasByRef.keys()];
    const latestContractsByAreaRef = deps.bakkiPhases.isConfigured() && areaRefs.length > 0
      ? await deps.bakkiPhases.getLatestContractsByAreaRefs(areaRefs)
      : new Map();

    return [...areasByRef.values()].map((area) => {
      const hectares = hectaresByAreaRef.get(area.areaRef) ?? null;
      const latestContract = latestContractsByAreaRef.get(area.areaRef) ?? null;

      return {
        area: hectares !== null ? `${formatHectares(hectares)} ha` : 'Unavailable',
        assignedSpeciesRef: area.assignedSpeciesRef,
        goal:
          latestContract?.contractTreeGoal && latestContract.contractTreeGoal > 0
            ? `${latestContract.contractTreeGoal.toLocaleString('en-US')} trees`
            : 'No trays assigned',
        id: area.areaRef,
        name: area.areaName,
        species: [
          latestContract?.speciesName,
          latestContract?.trayCount && latestContract.trayCount > 0
            ? `${latestContract.trayCount} tray${latestContract.trayCount === 1 ? '' : 's'}`
            : null,
          latestContract?.treesPerTray && latestContract.treesPerTray > 0
            ? `${latestContract.treesPerTray} trees/tray`
            : null,
        ].filter((value): value is string => Boolean(value)),
        subtitle: zoneNameById.get(area.zoneRef) ? `Zone: ${zoneNameById.get(area.zoneRef)}` : area.zoneRef,
      } satisfies PlantingWizardAreaData;
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown wizard area bootstrap error';
    deps.logger.warn(`Bakki Core wizard area bootstrap unavailable; returning empty area list. ${message}`);
    return [];
  }
}
