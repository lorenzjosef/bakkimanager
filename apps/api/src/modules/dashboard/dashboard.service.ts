import { Injectable, Logger } from '@nestjs/common';
import type {
  BakkiWorkflowState,
  DashboardProgramIcon,
  DashboardSummary,
} from '@bakki/domain';
import { BakkiAreaMetricsService } from '../../bakki-core/bakki-area-metrics.service';
import { BakkiGeometryService } from '../../bakki-core/bakki-geometry.service';
import { BakkiPhaseService } from '../../bakki-core/bakki-phase.service';
import { BakkiSpeciesService } from '../../bakki-core/bakki-species.service';
import { BakkiTaskMirrorService } from '../../bakki-core/bakki-task-mirror.service';
import {
  inferTaskTypeFromTitle,
  inferWorkflowStateFromStageLabel,
  type OdooTaskStageCandidate,
} from '../../odoo/odoo-task-mapping';
import { OdooService } from '../../odoo/odoo.service';
import { DashboardWeatherService } from './dashboard-weather.service';
import { ContractsService } from '../contracts/contracts.service';

interface ActivePhaseMetrics {
  averageDensity: number | null;
  fulfillmentPercent: number | null;
  name: string | null;
  totalContractGoal: number;
}

interface AreaMetricsSummary {
  activeZoneCount: number;
  averageDensity: number | null;
}

interface OdooTaskRecord {
  date_deadline?: string | false;
  id: number;
  name?: string;
  stage_id?: [number, string] | false;
  user_ids?: number[];
}

interface ProgramTaskCandidate {
  areaRef: string | null;
  assigneeCount: number | null;
  dueDate: string | null;
  id: number;
  taskType: string | null;
  title: string;
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly bakkiAreaMetrics: BakkiAreaMetricsService,
    private readonly bakkiGeometry: BakkiGeometryService,
    private readonly bakkiPhases: BakkiPhaseService,
    private readonly bakkiSpecies: BakkiSpeciesService,
    private readonly bakkiTasks: BakkiTaskMirrorService,
    private readonly odoo: OdooService,
    private readonly dashboardWeather: DashboardWeatherService,
    private readonly contractsService: ContractsService,
  ) {}

  async getSummary() {
    const summary = this.createEmptySummary();
    summary.localTimeValue = this.getLocalTimeLabel();

    const [
      activePhaseMetrics,
      areaMetricsSummary,
      todayProgram,
      activeSpeciesCount,
      ranchCoordinateLabel,
      currentConditions,
      contractSummary,
    ] = await Promise.all([
      this.fetchActivePhaseMetrics(),
      this.fetchAreaMetricsSummary(),
      this.fetchProgramOfDay(),
      this.fetchActiveSpeciesCount(),
      this.bakkiGeometry.getRanchCoordinateLabel(),
      this.dashboardWeather.getCurrentConditions(),
      this.fetchContractSummary(),
    ]);

    const liveDensityValue =
      areaMetricsSummary.averageDensity !== null
        ? this.formatDensityValue(areaMetricsSummary.averageDensity)
        : activePhaseMetrics?.averageDensity !== null && activePhaseMetrics?.averageDensity !== undefined
          ? this.formatDensityValue(activePhaseMetrics.averageDensity)
          : null;

    summary.activeZonesTitle = this.formatActiveZonesTitle(areaMetricsSummary.activeZoneCount);
    summary.activeZonesStatus = liveDensityValue
      ? `Avg. Density ${liveDensityValue}`
      : 'Avg. Density Unavailable';

    if (activePhaseMetrics) {
      summary.activePhase = {
        ...summary.activePhase,
        name: activePhaseMetrics.name || summary.activePhase.name,
        heroMetricValue: `${Math.max(activePhaseMetrics.fulfillmentPercent ?? 0, 0)}%`,
        primaryMetricValue: `${activePhaseMetrics.totalContractGoal.toLocaleString('en-US')} trees`,
        secondaryMetricValue: liveDensityValue ?? 'Unavailable',
      };
    } else if (liveDensityValue) {
      summary.activePhase = {
        ...summary.activePhase,
        secondaryMetricValue: liveDensityValue,
      };
    }

    summary.programItems = todayProgram.map((task) => this.mapProgramTask(task));

    if (typeof activeSpeciesCount === 'number' && Number.isFinite(activeSpeciesCount)) {
      summary.biodiversityActiveSpecies = activeSpeciesCount.toLocaleString('en-US');
      summary.biodiversityStackCount = `+${Math.max(activeSpeciesCount - 3, 0)}`;
    }

    if (ranchCoordinateLabel) {
      summary.activeZonesCoordinatesValue = ranchCoordinateLabel;
    }

    if (currentConditions) {
      summary.conditionsValue = currentConditions.conditionsValue;
      summary.conditionsCopy = currentConditions.conditionsCopy;
    }

    if (contractSummary) {
      summary.contractCompletionValue = `${contractSummary.globalFulfillmentPercent}%`;
      summary.contractCompletionCopy = `${contractSummary.globalPlantedTreeCount.toLocaleString('en-US')} of ${contractSummary.globalGoalTreeCount.toLocaleString('en-US')} trees planted across all zones.`;
    }

    return summary;
  }

  private createEmptySummary(): DashboardSummary {
    return {
      greetingName: 'Team',
      localTimeLabel: 'Local Time',
      localTimeValue: 'Unavailable',
      activePhase: {
        eyebrow: 'Active Planting Phase',
        heroMetricLabel: 'Contract Fulfillment',
        heroMetricValue: '0%',
        name: 'No active planting phase',
        primaryMetricLabel: 'Contract Goal',
        primaryMetricValue: '0 trees',
        secondaryMetricLabel: 'Avg. Density',
        secondaryMetricValue: 'Unavailable',
      },
      contractCompletionLabel: 'Global Contract',
      contractCompletionValue: '0%',
      contractCompletionCopy: '0 of 120,000 trees planted across all zones.',
      conditionsLabel: 'Conditions',
      conditionsValue: 'Unavailable',
      conditionsCopy: 'Weather feed unavailable',
      biodiversityLabel: 'Biodiversity Index',
      biodiversityActiveSpecies: '0',
      biodiversityCaption: 'Active Species',
      biodiversityStackCount: '+0',
      activeZonesTitle: '0 Active Zones',
      activeZonesStatus: 'Avg. Density Unavailable',
      activeZonesCoordinatesLabel: 'Coordinates',
      activeZonesCoordinatesValue: 'Unavailable',
      programPanelTitle: 'Program of the Day',
      programItems: [],
    };
  }

  private async fetchActivePhaseMetrics() {
    if (!this.bakkiPhases.isConfigured()) {
      return null;
    }

    try {
      const metrics = await this.bakkiPhases.getActivePhaseMetrics();
      return metrics ?? null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Bakki Core active-phase error';
      this.logger.warn(`Dashboard Bakki Core active-phase metrics unavailable. ${message}`);
      return null;
    }
  }

  private async fetchAreaMetricsSummary(): Promise<AreaMetricsSummary> {
    const zoneSummaries = await this.bakkiGeometry.listZoneSummaries();

    if (!this.bakkiAreaMetrics.isConfigured()) {
      return {
        activeZoneCount: zoneSummaries.length,
        averageDensity: null,
      };
    }

    try {
      const areaMetrics = await this.bakkiAreaMetrics.listByZoneRefs(
        zoneSummaries.map((zone) => zone.id),
      );
      const densityValues = areaMetrics
        .map((area) => area.currentDensityPer100Sqm)
        .filter((value): value is number => Number.isFinite(value) && value > 0);
      const zoneRefs = new Set(
        areaMetrics
          .map((area) => area.zoneRef)
          .filter((value): value is string => Boolean(value)),
      );

      return {
        activeZoneCount: zoneRefs.size > 0 ? zoneRefs.size : zoneSummaries.length,
        averageDensity:
          densityValues.length > 0
            ? Math.round(densityValues.reduce((sum, value) => sum + value, 0) / densityValues.length)
            : null,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Bakki Core zone-count error';
      this.logger.warn(`Dashboard Bakki Core zone count unavailable. ${message}`);
      return {
        activeZoneCount: zoneSummaries.length,
        averageDensity: null,
      };
    }
  }

  private async fetchActiveSpeciesCount() {
    if (!this.bakkiSpecies.isConfigured()) {
      return null;
    }

    try {
      const species = await this.bakkiSpecies.listSpecies();
      return species.length;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Bakki Core species-count error';
      this.logger.warn(`Dashboard Bakki Core species count unavailable. ${message}`);
      return null;
    }
  }

  private async fetchContractSummary() {
    try {
      return await this.contractsService.getSummary();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown contract summary error';
      this.logger.warn(`Dashboard contract summary unavailable. ${message}`);
      return null;
    }
  }

  private async fetchProgramOfDay() {
    if (this.bakkiTasks.isConfigured()) {
      try {
        const tasks = await this.bakkiTasks.listProgramCandidates(this.getTodayIsoDate(), 3);
        if (tasks.length > 0) {
          return tasks.map((task) => ({
            id: task.odooTaskId,
            title: task.title,
            dueDate: task.dueAt ? task.dueAt.slice(0, 10) : null,
            taskType: task.taskType ?? null,
            assigneeCount: null,
            areaRef: task.areaRef,
          })) satisfies ProgramTaskCandidate[];
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown Bakki Core program error';
        this.logger.warn(`Dashboard Bakki Core program unavailable; checking Odoo fallback. ${message}`);
      }
    }

    if (!this.odoo.isConfigured()) {
      return [];
    }

    try {
      const today = this.getTodayIsoDate();
      const todaysTasks = await this.odoo.searchRead<OdooTaskRecord>(
        'project.task',
        [['date_deadline', '=', today]],
        ['name', 'date_deadline', 'user_ids'],
        { limit: 3, order: 'priority desc, id asc' },
      );

      if (todaysTasks.length > 0) {
        const mirrors = this.bakkiTasks.isConfigured()
          ? await this.bakkiTasks.listByOdooTaskIds(todaysTasks.map((task) => task.id))
          : new Map();
        return todaysTasks.map((task) => ({
          id: task.id,
          title: task.name || `Task ${task.id}`,
          dueDate: typeof task.date_deadline === 'string' ? task.date_deadline : null,
          taskType: mirrors.get(task.id)?.taskType ?? inferTaskTypeFromTitle(task.name) ?? null,
          assigneeCount: Array.isArray(task.user_ids) ? task.user_ids.length : null,
          areaRef: mirrors.get(task.id)?.areaRef ?? null,
        })) satisfies ProgramTaskCandidate[];
      }

      const activeStageIds = await this.resolveStageIdsForWorkflowStates(['pending', 'in_progress']);
      const openTasks = await this.odoo.searchRead<OdooTaskRecord>(
        'project.task',
        activeStageIds.length > 0 ? [['stage_id', 'in', activeStageIds]] : [],
        ['name', 'date_deadline', 'user_ids', 'stage_id'],
        { limit: 3, order: 'date_deadline asc, id asc' },
      );

      const mirrors = this.bakkiTasks.isConfigured()
        ? await this.bakkiTasks.listByOdooTaskIds(openTasks.map((task) => task.id))
        : new Map();
      return openTasks.map((task) => ({
        id: task.id,
        title: task.name || `Task ${task.id}`,
        dueDate: typeof task.date_deadline === 'string' ? task.date_deadline : null,
        taskType: mirrors.get(task.id)?.taskType ?? inferTaskTypeFromTitle(task.name) ?? null,
        assigneeCount: Array.isArray(task.user_ids) ? task.user_ids.length : null,
        areaRef: mirrors.get(task.id)?.areaRef ?? null,
      })) satisfies ProgramTaskCandidate[];
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown program-of-day error';
      this.logger.warn(`Dashboard program of day unavailable. ${message}`);
      return [] satisfies ProgramTaskCandidate[];
    }
  }

  private mapProgramTask(task: ProgramTaskCandidate): DashboardSummary['programItems'][number] {
    const { accent, icon } = this.resolveProgramVisuals(task.taskType);

    return {
      id: `project-task-${task.id}`,
      title: task.taskType
        ? `${this.labelTaskType(task.taskType)}: ${task.title || `Task ${task.id}`}`
        : task.title || `Task ${task.id}`,
      subtitle: task.areaRef || 'Area unassigned',
      timeLabel: task.dueDate || 'Unscheduled',
      assigneeLabel:
        typeof task.assigneeCount === 'number' && task.assigneeCount > 0
          ? `Assigned to ${task.assigneeCount} crew member${task.assigneeCount === 1 ? '' : 's'}`
          : 'Assignee unavailable',
      icon,
      accent,
    };
  }

  private resolveProgramVisuals(taskType: string | null): {
    accent: 'green' | 'neutral';
    icon: DashboardProgramIcon;
  } {
    switch (taskType) {
      case 'monitoring':
        return { icon: 'leaf', accent: 'green' };
      case 'fertilizing':
        return { icon: 'crate', accent: 'neutral' };
      default:
        return { icon: 'cabin', accent: 'neutral' };
    }
  }

  private getLocalTimeLabel() {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(new Date());
  }

  private labelTaskType(taskType?: string) {
    switch (taskType) {
      case 'monitoring':
        return 'Monitoring';
      case 'fertilizing':
        return 'Fertilizing';
      default:
        return 'Planting';
    }
  }

  private getTodayIsoDate() {
    return new Date().toISOString().slice(0, 10);
  }

  private formatActiveZonesTitle(activeZoneCount: number) {
    return `${activeZoneCount.toLocaleString('en-US')} Active Zone${activeZoneCount === 1 ? '' : 's'}`;
  }

  private formatDensityValue(densityPer100Sqm: number) {
    return `${densityPer100Sqm} / 100m²`;
  }

  private async resolveStageIdsForWorkflowStates(states: BakkiWorkflowState[]) {
    const stages = await this.odoo.searchRead<OdooTaskStageCandidate>(
      'project.task.type',
      [],
      ['name', 'sequence', 'fold', 'project_ids'],
      { order: 'sequence asc, id asc' },
    );

    return stages
      .filter((stage) =>
        states.includes(inferWorkflowStateFromStageLabel(typeof stage.name === 'string' ? stage.name : null)),
      )
      .map((stage) => stage.id);
  }
}
