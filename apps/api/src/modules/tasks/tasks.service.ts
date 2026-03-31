import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  type BakkiWorkflowState,
  type CreateTaskRequest,
  type CreateTaskResponse,
  type RecordMonitoringResultRequest,
  type RecordMonitoringResultResponse,
  type UpdateTaskWorkflowResponse,
} from '@bakki/domain';
import { BakkiAreaMetricsService } from '../../bakki-core/bakki-area-metrics.service';
import { BakkiGeometryService } from '../../bakki-core/bakki-geometry.service';
import { BakkiMapAuditService } from '../../bakki-core/bakki-map-audit.service';
import { BakkiTaskMirrorService } from '../../bakki-core/bakki-task-mirror.service';
import { BakkiTaskTemplateService } from '../../bakki-core/bakki-task-template.service';
import { BakkiTreeSurveyService } from '../../bakki-core/bakki-tree-survey.service';
import { BakkiUserMirrorService } from '../../bakki-core/bakki-user-mirror.service';
import { OdooService } from '../../odoo/odoo.service';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import { buildEmptyTaskSummary } from './tasks.service.helpers';
import {
  createTask as createTaskMutation,
  recordMonitoringResult as recordMonitoringResultMutation,
  updateWorkflowState as updateWorkflowStateMutation,
} from './tasks.service.mutations';
import {
  getBakkiCoreTaskSummary,
  getOdooTaskSummary,
  refreshTaskMirrorForOdooTaskId,
  refreshTaskMirrorsFromOdoo,
  type TaskRuntimeDeps,
} from './tasks.service.runtime';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly bakkiAreaMetrics: BakkiAreaMetricsService,
    private readonly bakkiGeometry: BakkiGeometryService,
    private readonly auditService: AuditService,
    private readonly authService: AuthService,
    private readonly bakkiTasks: BakkiTaskMirrorService,
    private readonly bakkiTaskTemplates: BakkiTaskTemplateService,
    private readonly bakkiTreeSurvey: BakkiTreeSurveyService,
    private readonly bakkiUsers: BakkiUserMirrorService,
    private readonly bakkiMapAudit: BakkiMapAuditService,
    private readonly odoo: OdooService,
  ) {}

  async getTemplates() {
    try {
      return await this.bakkiTaskTemplates.listActive();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown task-template error';
      this.logger.warn(`Bakki task template catalog unavailable. ${message}`);
      throw new ServiceUnavailableException('Bakki task template catalog is currently unavailable.');
    }
  }

  async getSummary() {
    if (this.bakkiTasks.isConfigured()) {
      try {
        return await getBakkiCoreTaskSummary({
          bakkiGeometry: this.bakkiGeometry,
          bakkiTasks: this.bakkiTasks,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown Bakki Core task summary error';
        this.logger.warn(`Bakki Core task summary unavailable; checking Odoo task summary. ${message}`);
      }
    }

    if (!this.odoo.isConfigured()) {
      return buildEmptyTaskSummary();
    }

    try {
      return await getOdooTaskSummary(this.runtimeDeps);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Odoo task summary error';
      this.logger.warn(`Falling back to empty task summary. ${message}`);
      return buildEmptyTaskSummary();
    }
  }

  async refreshMirrorsFromOdoo(limit = 100) {
    return refreshTaskMirrorsFromOdoo(this.runtimeDeps, limit);
  }

  async refreshMirrorForOdooTaskId(odooTaskId: number) {
    return refreshTaskMirrorForOdooTaskId(this.runtimeDeps, odooTaskId);
  }

  async markMirrorSyncFailure(odooTaskId: number, message: string) {
    await this.bakkiTasks.markSyncFailureByOdooTaskId(odooTaskId, message);
  }

  async createTask(input: CreateTaskRequest, sessionToken?: string): Promise<CreateTaskResponse> {
    return createTaskMutation(this.mutationDeps, this.runtimeDeps, input, sessionToken);
  }

  async updateWorkflowState(
    taskId: string,
    workflowState: BakkiWorkflowState,
    sessionToken?: string,
  ): Promise<UpdateTaskWorkflowResponse> {
    return updateWorkflowStateMutation(
      this.mutationDeps,
      this.runtimeDeps,
      taskId,
      workflowState,
      sessionToken,
    );
  }

  async recordMonitoringResult(
    taskId: string,
    input: RecordMonitoringResultRequest,
    sessionToken?: string,
  ): Promise<RecordMonitoringResultResponse> {
    return recordMonitoringResultMutation(
      this.mutationDeps,
      this.runtimeDeps,
      taskId,
      input,
      sessionToken,
    );
  }

  private get runtimeDeps(): TaskRuntimeDeps {
    return {
      bakkiGeometry: this.bakkiGeometry,
      bakkiTaskTemplates: this.bakkiTaskTemplates,
      bakkiTasks: this.bakkiTasks,
      logger: this.logger,
      odoo: this.odoo,
    };
  }

  private get mutationDeps() {
    return {
      auditService: this.auditService,
      authService: this.authService,
      bakkiAreaMetrics: this.bakkiAreaMetrics,
      bakkiGeometry: this.bakkiGeometry,
      bakkiMapAudit: this.bakkiMapAudit,
      bakkiTaskTemplates: this.bakkiTaskTemplates,
      bakkiTreeSurvey: this.bakkiTreeSurvey,
      bakkiTasks: this.bakkiTasks,
      bakkiUsers: this.bakkiUsers,
      logger: this.logger,
      odoo: this.odoo,
    };
  }
}
