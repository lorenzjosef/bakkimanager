import { Injectable, Logger } from '@nestjs/common';
import {
  localAssetUrls,
  type PlantingPhaseTimelineItem,
} from '@bakki/domain';
import { BakkiAreaMetricsService } from '../../bakki-core/bakki-area-metrics.service';
import { BakkiPhaseService } from '../../bakki-core/bakki-phase.service';
import { BakkiGeometryService } from '../../bakki-core/bakki-geometry.service';
import { BakkiTreeSurveyService } from '../../bakki-core/bakki-tree-survey.service';
import { BakkiUserMirrorService } from '../../bakki-core/bakki-user-mirror.service';
import { BakkiSpeciesService } from '../../bakki-core/bakki-species.service';
import { OdooService } from '../../odoo/odoo.service';
import { AuthService } from '../auth/auth.service';
import { AuditService } from '../audit/audit.service';
import { buildPhaseWizardData } from './phases.service.bootstrap';
import { createPhase as createPhaseMutation } from './phases.service.mutations';
import {
  applySelectedPhaseDetailToOverview,
  buildOverviewData,
  buildPhaseDetail,
  formatPhaseDateRange,
  mapParticipantToPhaseMember,
  mapPhaseBadge,
  parseNumericId,
} from './phases.service.helpers';

@Injectable()
export class PhasesService {
  private readonly logger = new Logger(PhasesService.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly authService: AuthService,
    private readonly bakkiAreaMetrics: BakkiAreaMetricsService,
    private readonly bakkiGeometry: BakkiGeometryService,
    private readonly bakkiTreeSurvey: BakkiTreeSurveyService,
    private readonly bakkiPhases: BakkiPhaseService,
    private readonly bakkiSpecies: BakkiSpeciesService,
    private readonly bakkiUsers: BakkiUserMirrorService,
    private readonly odoo: OdooService,
  ) {}

  async getOverview() {
    const overview = buildOverviewData();
    if (!this.bakkiPhases.isConfigured()) {
      return overview;
    }

    try {
      const phases = await this.bakkiPhases.listRecentPhases(4);
      if (phases.length === 0) {
        return overview;
      }

      const phaseIds = phases
        .map((phase) => parseNumericId(phase.createdPhaseId, 'phase-'))
        .filter((value): value is number => value !== null);
      const [contractsByPhaseId, participantsByPhaseId] = await Promise.all([
        this.bakkiPhases.listContractsByPhaseIds(phaseIds),
        this.bakkiPhases.listParticipantsByPhaseIds(phaseIds),
      ]);
      const areaRefs = Array.from(
        new Set(
          [...contractsByPhaseId.values()]
            .flat()
            .map((contract) => contract.areaRef)
            .filter(Boolean),
        ),
      );
      const liveAreaMetrics = (
        this.bakkiAreaMetrics.isConfigured()
        || this.bakkiTreeSurvey.isConfigured()
      ) && areaRefs.length > 0
        ? await this.bakkiAreaMetrics.listByAreaRefs(areaRefs)
        : [];
      const areaMetricsByAreaRef = new Map(liveAreaMetrics.map((record) => [record.areaRef, record] as const));

      overview.phases = phases.map((phase) => {
        const phaseId = parseNumericId(phase.createdPhaseId, 'phase-');
        const detail = phaseId
          ? buildPhaseDetail({
              areaMetricsByAreaRef,
              areaRefs: (contractsByPhaseId.get(phaseId) ?? []).map((contract) => contract.areaRef),
              phaseId,
              participantCount: phase.participantCount,
              participantNames: (participantsByPhaseId.get(phaseId) ?? []).map((participant) => participant.userName).filter((value): value is string => Boolean(value)),
              participantTeamMembers: (participantsByPhaseId.get(phaseId) ?? []).map((participant, participantIndex) =>
                mapParticipantToPhaseMember(participant.userId, participant.userName, participant.role, participantIndex),
              ),
              phaseName: phase.phaseName,
              phaseState: phase.state,
              totalContractGoal: (contractsByPhaseId.get(phaseId) ?? []).reduce(
                (sum, contract) => sum + Math.max(contract.contractTreeGoal ?? 0, 0),
                0,
              ),
            })
          : null;

        return {
          id: phase.createdPhaseId,
          isClickable: Boolean(detail),
          title: phase.phaseName,
          status: phase.state === 'active' ? 'active' : 'complete',
          badgeLabel: mapPhaseBadge(phase.state),
          dateLabel: formatPhaseDateRange(phase.startDate, phase.endDate),
          metrics: [
            {
              iconUrl: localAssetUrls.phaseOverviewMetricTeam,
              label: `${phase.participantCount} personnel assigned`,
            },
            {
              iconUrl: localAssetUrls.phaseOverviewMetricSaplings,
              label: `${phase.assignedContractCount} area contracts`,
            },
          ],
          detail,
        } satisfies PlantingPhaseTimelineItem;
      });
      overview.selectedPhaseId =
        overview.phases.find((phase) => phase.status === 'active')?.id
        ?? overview.phases[0]?.id
        ?? null;

      return applySelectedPhaseDetailToOverview(overview);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown phase overview error';
      this.logger.warn(`Bakki Core phase overview unavailable; returning empty phase data. ${message}`);
      return overview;
    }
  }

  async getWizardData() {
    return buildPhaseWizardData({
      bakkiGeometry: this.bakkiGeometry,
      bakkiPhases: this.bakkiPhases,
      bakkiUsers: this.bakkiUsers,
      logger: this.logger,
    });
  }

  async createPhase(
    input: import('@bakki/domain').CreatePlantingPhaseRequest,
    sessionToken?: string,
  ): Promise<import('@bakki/domain').CreatePlantingPhaseResponse> {
    return createPhaseMutation(
      {
        auditService: this.auditService,
        authService: this.authService,
        bakkiGeometry: this.bakkiGeometry,
        bakkiPhases: this.bakkiPhases,
        bakkiSpecies: this.bakkiSpecies,
        bakkiUsers: this.bakkiUsers,
        logger: this.logger,
        odoo: this.odoo,
      },
      input,
      sessionToken,
    );
  }
}
