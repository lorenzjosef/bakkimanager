import { Injectable, Logger } from '@nestjs/common';
import {
  GLOBAL_RANCH_CONTRACT_TREE_GOAL,
  type ContractsSummary,
  type ZoneContractSummary,
} from '@bakki/domain';
import { BakkiAreaMetricsService } from '../../bakki-core/bakki-area-metrics.service';
import { BakkiGeometryService } from '../../bakki-core/bakki-geometry.service';
import { BakkiPhaseService } from '../../bakki-core/bakki-phase.service';

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(
    private readonly bakkiAreaMetrics: BakkiAreaMetricsService,
    private readonly bakkiGeometry: BakkiGeometryService,
    private readonly bakkiPhases: BakkiPhaseService,
  ) {}

  async getSummary(): Promise<ContractsSummary> {
    const [zoneSummaries, areaCatalog] = await Promise.all([
      this.bakkiGeometry.listZoneSummaries(),
      this.bakkiGeometry.listAreas(),
    ]);

    const areaRefs = [...areaCatalog.keys()];
    const [areaMetricsByAreaRef, contractsByAreaRef] = await Promise.all([
      this.getAreaMetricsByAreaRef(areaRefs),
      this.getLatestContractsByAreaRef(areaRefs),
    ]);

    const orderedZoneIds = zoneSummaries.map((zone) => zone.id);
    const zoneNamesById = new Map(zoneSummaries.map((zone) => [zone.id, zone.name] as const));

    for (const area of areaCatalog.values()) {
      if (!zoneNamesById.has(area.zoneRef)) {
        zoneNamesById.set(area.zoneRef, area.zoneRef);
        orderedZoneIds.push(area.zoneRef);
      }
    }

    const zones = orderedZoneIds.map((zoneId) => {
      const areas = [...areaCatalog.values()]
        .filter((area) => area.zoneRef === zoneId)
        .sort((left, right) => left.areaName.localeCompare(right.areaName));

      const plantedTreeCount = areas.reduce(
        (sum, area) => sum + Math.max(areaMetricsByAreaRef.get(area.areaRef)?.currentTreeCount ?? 0, 0),
        0,
      );
      const goalTreeCount = areas.reduce(
        (sum, area) => sum + Math.max(contractsByAreaRef.get(area.areaRef)?.contractTreeGoal ?? 0, 0),
        0,
      );

      return {
        areaCount: areas.length,
        areas: areas.map((area) => ({
          areaId: area.areaRef,
          areaName: area.areaName,
          currentTreeCount: Math.max(areaMetricsByAreaRef.get(area.areaRef)?.currentTreeCount ?? 0, 0),
        })),
        fulfillmentPercent: goalTreeCount > 0 ? Math.round((plantedTreeCount / goalTreeCount) * 100) : null,
        goalTreeCount,
        plantedTreeCount,
        zoneId,
        zoneName: zoneNamesById.get(zoneId) ?? zoneId,
      } satisfies ZoneContractSummary;
    });

    const globalPlantedTreeCount = zones.reduce((sum, zone) => sum + zone.plantedTreeCount, 0);

    return {
      globalFulfillmentPercent: Math.round((globalPlantedTreeCount / GLOBAL_RANCH_CONTRACT_TREE_GOAL) * 100),
      globalGoalTreeCount: GLOBAL_RANCH_CONTRACT_TREE_GOAL,
      globalPlantedTreeCount,
      zones,
    };
  }

  private async getAreaMetricsByAreaRef(areaRefs: string[]) {
    if (!this.bakkiAreaMetrics.isConfigured() || areaRefs.length === 0) {
      return new Map<string, Awaited<ReturnType<BakkiAreaMetricsService['listByAreaRefs']>>[number]>();
    }

    try {
      const areaMetrics = await this.bakkiAreaMetrics.listByAreaRefs(areaRefs);
      return new Map(areaMetrics.map((area) => [area.areaRef, area] as const));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown area-metrics aggregation error';
      this.logger.warn(`Contracts area metrics unavailable. ${message}`);
      return new Map<string, Awaited<ReturnType<BakkiAreaMetricsService['listByAreaRefs']>>[number]>();
    }
  }

  private async getLatestContractsByAreaRef(areaRefs: string[]) {
    if (!this.bakkiPhases.isConfigured() || areaRefs.length === 0) {
      return new Map<string, Awaited<ReturnType<BakkiPhaseService['getLatestContractsByAreaRefs']>> extends Map<string, infer TValue> ? TValue : never>();
    }

    try {
      return await this.bakkiPhases.getLatestContractsByAreaRefs(areaRefs);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown contract aggregation error';
      this.logger.warn(`Contracts phase goals unavailable. ${message}`);
      return new Map<string, Awaited<ReturnType<BakkiPhaseService['getLatestContractsByAreaRefs']>> extends Map<string, infer TValue> ? TValue : never>();
    }
  }
}
