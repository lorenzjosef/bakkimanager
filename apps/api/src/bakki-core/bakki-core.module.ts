import { Global, Module } from '@nestjs/common';
import { BakkiAreaMetricsService } from './bakki-area-metrics.service';
import { BakkiAuditLogService } from './bakki-audit-log.service';
import { BakkiCoreService } from './bakki-core.service';
import { BakkiGeometryService } from './bakki-geometry.service';
import { BakkiMapAuditService } from './bakki-map-audit.service';
import { BakkiMediaAssetService } from './bakki-media-asset.service';
import { BakkiPhaseService } from './bakki-phase.service';
import { BakkiSpeciesService } from './bakki-species.service';
import { BakkiTaskMirrorService } from './bakki-task-mirror.service';
import { BakkiTaskTemplateService } from './bakki-task-template.service';
import { BakkiUserMirrorService } from './bakki-user-mirror.service';

@Global()
@Module({
  providers: [BakkiCoreService, BakkiUserMirrorService, BakkiTaskTemplateService, BakkiTaskMirrorService, BakkiPhaseService, BakkiAuditLogService, BakkiAreaMetricsService, BakkiGeometryService, BakkiMapAuditService, BakkiMediaAssetService, BakkiSpeciesService],
  exports: [BakkiCoreService, BakkiUserMirrorService, BakkiTaskTemplateService, BakkiTaskMirrorService, BakkiPhaseService, BakkiAuditLogService, BakkiAreaMetricsService, BakkiGeometryService, BakkiMapAuditService, BakkiMediaAssetService, BakkiSpeciesService],
})
export class BakkiCoreModule {}
