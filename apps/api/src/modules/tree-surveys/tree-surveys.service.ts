import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type {
  CreateTreePlotRequest,
  TreeSizeDistributionBin,
  RecordTreePlotSampleRequest,
  TreePlotAreaRollup,
  TreePlotDetail,
  TreePlotSampleSummary,
  TreePlotSummary,
  TreePlotZoneRollup,
  UpdateTreePlotRequest,
} from '@bakki/domain';
import { BakkiTreeSurveyService } from '../../bakki-core/bakki-tree-survey.service';
import { validateGeoJsonGeometry } from '../../common/validation';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class TreeSurveysService {
  constructor(
    private readonly authService: AuthService,
    private readonly bakkiTreeSurvey: BakkiTreeSurveyService,
  ) {}

  async listPlots(ranchId?: string): Promise<TreePlotSummary[]> {
    this.requireConfigured();
    const plots = await this.bakkiTreeSurvey.listPlots(ranchId?.trim() || undefined);
    return plots.map((plot) => ({
      plotId: plot.plotRef,
      ranchId: plot.ranchRef,
      name: plot.name,
      description: plot.description,
      areaHectares: plot.areaHectares,
      estimate: plot.estimate,
      createdAt: plot.createdAt,
      updatedAt: plot.updatedAt,
    }));
  }

  async getPlot(plotId: string): Promise<TreePlotDetail> {
    this.requireConfigured();
    const plot = await this.bakkiTreeSurvey.getPlot(plotId);
    if (!plot) {
      throw new NotFoundException('Tree survey plot was not found.');
    }

    return {
      plotId: plot.plotRef,
      ranchId: plot.ranchRef,
      name: plot.name,
      description: plot.description,
      areaHectares: plot.areaHectares,
      estimate: plot.estimate,
      createdByUserId: plot.createdByUserId,
      geometry: plot.geometry,
      createdAt: plot.createdAt,
      updatedAt: plot.updatedAt,
    };
  }

  async createPlot(
    input: CreateTreePlotRequest,
    sessionToken?: string,
  ): Promise<TreePlotDetail> {
    this.requireConfigured();
    const actor = await this.authService.requireSessionActor(sessionToken);
    this.assertOwner(actor.session.user.role);
    this.assertPlotGeometry(input.geometry);

    const created = await this.bakkiTreeSurvey.createPlot({
      name: input.name,
      description: input.description,
      geometry: input.geometry,
      ranchRef: input.ranchId,
      createdByUserId: actor.profileId ?? null,
    });

    return {
      plotId: created.plotRef,
      ranchId: created.ranchRef,
      name: created.name,
      description: created.description,
      areaHectares: created.areaHectares,
      estimate: created.estimate,
      createdByUserId: created.createdByUserId,
      geometry: created.geometry,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  }

  async updatePlot(
    plotId: string,
    input: UpdateTreePlotRequest,
    sessionToken?: string,
  ): Promise<TreePlotDetail> {
    this.requireConfigured();
    const actor = await this.authService.requireSessionActor(sessionToken);
    this.assertOwner(actor.session.user.role);

    if (input.geometry) {
      this.assertPlotGeometry(input.geometry);
    }

    const updated = await this.bakkiTreeSurvey.updatePlot(plotId, input);
    if (!updated) {
      throw new NotFoundException('Tree survey plot was not found.');
    }

    return {
      plotId: updated.plotRef,
      ranchId: updated.ranchRef,
      name: updated.name,
      description: updated.description,
      areaHectares: updated.areaHectares,
      estimate: updated.estimate,
      createdByUserId: updated.createdByUserId,
      geometry: updated.geometry,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async listSamples(plotId: string): Promise<TreePlotSampleSummary[]> {
    this.requireConfigured();
    return (await this.bakkiTreeSurvey.listSamples(plotId)).map((sample) => ({
      id: sample.id,
      plotId: sample.plotRef,
      sampledAreaSqm: sample.sampledAreaSqm,
      measuredDensityPer100Sqm: sample.measuredDensityPer100Sqm,
      treeCount: sample.treeCount,
      meanHeightM: sample.meanHeightM,
      meanDiameterCm: sample.meanDiameterCm,
      sizeDistribution: sample.sizeDistribution as TreePlotSampleSummary['sizeDistribution'],
      sampleGeometry: sample.sampleGeometry,
      actorUserId: sample.actorUserId,
      taskRef: sample.taskRef,
      notes: sample.notes,
      sampledAt: sample.sampledAt,
    }));
  }

  async recordSample(
    plotId: string,
    input: RecordTreePlotSampleRequest,
    sessionToken?: string,
  ): Promise<TreePlotSampleSummary> {
    this.requireConfigured();
    const actor = await this.authService.requireSessionActor(sessionToken);
    if (!actor.profileId) {
      throw new BadRequestException('Authenticated survey updates require a Bakki user context.');
    }

    if (input.sampleGeometry) {
      this.assertPlotGeometry(input.sampleGeometry);
    }

    const sample = await this.bakkiTreeSurvey.recordSample(plotId, {
      densityPer100Sqm: input.densityPer100Sqm,
      treeCount: input.treeCount,
      sampledAreaSqm: input.sampledAreaSqm,
      meanHeightM: input.meanHeightM,
      meanDiameterCm: input.meanDiameterCm,
      sampleGeometry: input.sampleGeometry,
      sampledAt: input.sampledAt,
      notes: input.notes,
      taskRef: input.taskRef,
      sizeDistribution: input.sizeDistribution as Array<Record<string, unknown>> | null | undefined,
      actorUserId: actor.profileId,
    });

    return {
      id: sample.id,
      plotId: sample.plotRef,
      sampledAreaSqm: sample.sampledAreaSqm,
      measuredDensityPer100Sqm: sample.measuredDensityPer100Sqm,
      treeCount: sample.treeCount,
      meanHeightM: sample.meanHeightM,
      meanDiameterCm: sample.meanDiameterCm,
      sizeDistribution: sample.sizeDistribution as TreeSizeDistributionBin[] | null,
      sampleGeometry: sample.sampleGeometry,
      actorUserId: sample.actorUserId,
      taskRef: sample.taskRef,
      notes: sample.notes,
      sampledAt: sample.sampledAt,
    };
  }

  async getAreaRollups(areaIds: string[]): Promise<TreePlotAreaRollup[]> {
    this.requireConfigured();
    const normalized = areaIds.map((areaId) => areaId.trim()).filter(Boolean);
    const records = await this.bakkiTreeSurvey.listAreaRollups(normalized);
    return normalized
      .map((areaId) => records.get(areaId))
      .filter((record): record is NonNullable<typeof record> => Boolean(record))
      .map((record) => ({
        areaId: record.areaRef,
        zoneId: record.zoneRef,
        overlapAreaSqm: record.overlapAreaSqm,
        estimatedDensityPer100Sqm: record.estimatedDensityPer100Sqm,
        estimatedTreeCount: record.estimatedTreeCount,
        meanHeightM: record.meanHeightM,
        meanDiameterCm: record.meanDiameterCm,
        plotCount: record.plotCount,
        source: 'plot_estimate_projection',
        updatedAt: record.updatedAt,
      }));
  }

  async getZoneRollups(zoneIds: string[]): Promise<TreePlotZoneRollup[]> {
    this.requireConfigured();
    const normalized = zoneIds.map((zoneId) => zoneId.trim()).filter(Boolean);
    const records = await this.bakkiTreeSurvey.listZoneRollups(normalized);
    return normalized
      .map((zoneId) => records.get(zoneId))
      .filter((record): record is NonNullable<typeof record> => Boolean(record))
      .map((record) => ({
        zoneId: record.zoneRef,
        overlapAreaSqm: record.overlapAreaSqm,
        estimatedDensityPer100Sqm: record.estimatedDensityPer100Sqm,
        estimatedTreeCount: record.estimatedTreeCount,
        meanHeightM: record.meanHeightM,
        meanDiameterCm: record.meanDiameterCm,
        plotCount: record.plotCount,
        source: 'plot_estimate_projection',
        updatedAt: record.updatedAt,
      }));
  }

  private requireConfigured() {
    if (!this.bakkiTreeSurvey.isConfigured()) {
      throw new ServiceUnavailableException('Bakki Core tree surveys are unavailable.');
    }
  }

  private assertOwner(role: string) {
    if (role !== 'owner') {
      throw new ForbiddenException('Only Bakki owners can modify tree survey plots.');
    }
  }

  private assertPlotGeometry(geometry: import('@bakki/domain').GeoJsonGeometry) {
    validateGeoJsonGeometry(
      geometry as { coordinates: unknown; type: string },
      ['Polygon', 'MultiPolygon'],
    );
  }
}
