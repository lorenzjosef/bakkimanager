import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import type { Logger } from '@nestjs/common';
import type {
  UpdateAreaMetricsRequest,
  UpdateAreaMetricsResponse,
} from '@bakki/domain';
import type { BakkiAreaMetricsService } from '../../bakki-core/bakki-area-metrics.service';
import type { BakkiMapAuditService } from '../../bakki-core/bakki-map-audit.service';
import type { AuditService } from '../audit/audit.service';
import type { AuthService } from '../auth/auth.service';
import { isBakkiCoreConnectivityError } from './map.service.helpers';

interface MapServiceMetricsDeps {
  auditService: AuditService;
  authService: AuthService;
  bakkiAreaMetrics: BakkiAreaMetricsService;
  bakkiMapAudit: BakkiMapAuditService;
  logger: Pick<Logger, 'error'>;
}

export async function updateAreaMetrics(
  deps: MapServiceMetricsDeps,
  areaId: string,
  input: UpdateAreaMetricsRequest,
  sessionToken?: string,
): Promise<UpdateAreaMetricsResponse> {
  if (!Number.isFinite(input.densityPer100Sqm) || input.densityPer100Sqm <= 0) {
    throw new BadRequestException('Area density must be a positive number.');
  }

  if (
    typeof input.treeCount === 'number'
    && (!Number.isFinite(input.treeCount) || input.treeCount < 0)
  ) {
    throw new BadRequestException('Tree count must be zero or a positive number.');
  }

  const actor = await deps.authService.requireSessionActor(sessionToken);

  if (!deps.bakkiAreaMetrics.isConfigured()) {
    throw new ServiceUnavailableException('Bakki Core area metrics are unavailable.');
  }

  try {
    const area = await deps.bakkiAreaMetrics.updateMetrics({
      areaRef: areaId,
      densityPer100Sqm: input.densityPer100Sqm,
      treeCount: input.treeCount,
    });

    await deps.auditService.recordEvent({
      actor: actor.session.user.id,
      message: `Updated area metrics for ${area.areaName}`,
      payload: {
        densityPer100Sqm: input.densityPer100Sqm,
        treeCount: typeof input.treeCount === 'number' ? Math.round(input.treeCount) : null,
      },
      targetModel: 'bakki_area_metrics',
      type: 'area.metrics_update',
    });
    await deps.bakkiMapAudit.create({
      editorUserId: actor.profileId ?? null,
      entityType: 'area_metrics',
      entityRef: area.areaRef,
      changeType: 'metrics_update',
      changeSummary: `Updated metrics for ${area.areaName}`,
      diffPayload: {
        densityPer100Sqm: input.densityPer100Sqm,
        treeCount: typeof input.treeCount === 'number' ? Math.round(input.treeCount) : area.currentTreeCount,
        zoneId: area.zoneRef,
      },
    });

    return {
      areaId: area.areaRef,
      areaName: area.areaName,
      densityPer100Sqm: area.currentDensityPer100Sqm,
      treeCount: area.currentTreeCount,
      updatedAt: area.updatedAt,
      zoneId: area.zoneRef,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown area metrics update error';
    if (isBakkiCoreConnectivityError(message)) {
      deps.logger.error(`Area metrics update failed because Bakki Core is unavailable: ${message}`);
      throw new ServiceUnavailableException('Bakki Core area metrics are unavailable.');
    }

    deps.logger.error(`Area metrics update failed: ${message}`);
    throw new BadRequestException('Area metrics could not be updated.');
  }
}
