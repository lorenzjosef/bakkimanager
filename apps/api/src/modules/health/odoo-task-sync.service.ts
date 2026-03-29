import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  BakkiWorkflowState,
  OdooTaskSyncProvisionResult,
  OdooTaskWriteProbeResult,
  SettingsOdooDiagnostics,
} from '@bakki/domain';
import {
  chooseStageIdForWorkflowState,
  inferWorkflowStateFromStageLabel,
  type OdooTaskStageCandidate,
} from '../../odoo/odoo-task-mapping';
import { OdooService } from '../../odoo/odoo.service';
import { TasksService } from '../tasks/tasks.service';

interface OdooProjectCandidate {
  id: number;
  name?: string;
}

@Injectable()
export class OdooTaskSyncService {
  constructor(
    private readonly odoo: OdooService,
    private readonly tasksService: TasksService,
  ) {}

  async getReadiness(): Promise<SettingsOdooDiagnostics['taskSync']> {
    const checkedAt = new Date().toISOString();
    const emptyCounts: Record<BakkiWorkflowState, number> = {
      pending: 0,
      in_progress: 0,
      done: 0,
      cancelled: 0,
    };

    if (!this.odoo.isConfigured()) {
      return {
        checkedAt,
        configured: false,
        defaultProject: null,
        message: 'Odoo service credentials are not configured for task sync diagnostics.',
        missingWorkflowStates: ['pending', 'in_progress', 'done', 'cancelled'],
        stageCounts: emptyCounts,
        stageMappings: [],
        writeReady: false,
      };
    }

    try {
      const [projects, stages] = await Promise.all([
        this.odoo.searchRead<OdooProjectCandidate>(
          'project.project',
          [],
          ['name'],
          { limit: 1, order: 'id asc' },
        ),
        this.odoo.searchRead<OdooTaskStageCandidate>(
          'project.task.type',
          [],
          ['name', 'sequence', 'fold', 'project_ids'],
          { order: 'sequence asc, id asc' },
        ),
      ]);

      const defaultProject = projects[0]
        ? {
            id: projects[0].id,
            name: projects[0].name || null,
          }
        : null;
      const stageMappings = stages.map((stage) => ({
        id: stage.id,
        name: typeof stage.name === 'string' ? stage.name : `Stage ${stage.id}`,
        sequence: typeof stage.sequence === 'number' ? stage.sequence : null,
        fold: Boolean(stage.fold),
        projectCount: Array.isArray(stage.project_ids) ? stage.project_ids.length : 0,
        workflowState: inferWorkflowStateFromStageLabel(
          typeof stage.name === 'string' ? stage.name : null,
        ),
      }));

      const stageCounts = stageMappings.reduce<Record<BakkiWorkflowState, number>>(
        (counts, stage) => {
          counts[stage.workflowState] += 1;
          return counts;
        },
        {
          pending: 0,
          in_progress: 0,
          done: 0,
          cancelled: 0,
        },
      );

      const requiredStates: BakkiWorkflowState[] = ['pending', 'in_progress', 'done'];
      const missingWorkflowStates = requiredStates.filter((state) => stageCounts[state] === 0);
      const writeReady = Boolean(defaultProject) && missingWorkflowStates.length === 0;

      return {
        checkedAt,
        configured: true,
        defaultProject,
        message: writeReady
          ? 'Default project and standard stage mappings are available for Bakki task sync.'
          : 'Bakki task sync needs a default project plus standard pending/in-progress/done stages.',
        missingWorkflowStates,
        stageCounts,
        stageMappings,
        writeReady,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Odoo task sync diagnostic error';
      return {
        checkedAt,
        configured: true,
        defaultProject: null,
        message,
        missingWorkflowStates: ['pending', 'in_progress', 'done', 'cancelled'],
        stageCounts: emptyCounts,
        stageMappings: [],
        writeReady: false,
      };
    }
  }

  async provision(): Promise<OdooTaskSyncProvisionResult> {
    const startedAt = new Date().toISOString();

    if (!this.odoo.isConfigured()) {
      throw new BadRequestException('Odoo service credentials are not configured.');
    }

    let [defaultProject] = await this.odoo.searchRead<OdooProjectCandidate>(
      'project.project',
      [],
      ['name'],
      { limit: 1, order: 'id asc' },
    );

    let createdProject: OdooTaskSyncProvisionResult['createdProject'] = null;
    if (!defaultProject) {
      const createdProjectId = await this.odoo.executeKw<number>('project.project', 'create', [
        {
          name: 'Bakki Operations',
        },
      ]);
      defaultProject = {
        id: createdProjectId,
        name: 'Bakki Operations',
      };
      createdProject = {
        id: createdProjectId,
        name: 'Bakki Operations',
      };
    }

    const existingStages = await this.odoo.searchRead<OdooTaskStageCandidate>(
      'project.task.type',
      [],
      ['name', 'sequence', 'fold', 'project_ids'],
      { order: 'sequence asc, id asc' },
    );

    const createdStages: OdooTaskSyncProvisionResult['createdStages'] = [];
    for (const spec of TASK_SYNC_STAGE_SPECS) {
      const hasExplicitStage = existingStages.some(
        (stage) =>
          stageMatchesProject(stage, defaultProject.id)
          && inferWorkflowStateFromStageLabel(typeof stage.name === 'string' ? stage.name : null)
            === spec.workflowState,
      );

      if (hasExplicitStage) {
        continue;
      }

      const createdStageId = await this.odoo.executeKw<number>('project.task.type', 'create', [
        {
          name: spec.name,
          sequence: spec.sequence,
          fold: spec.fold,
        },
      ]);

      existingStages.push({
        id: createdStageId,
        name: spec.name,
        sequence: spec.sequence,
        fold: spec.fold,
        project_ids: false,
      });
      createdStages.push({
        id: createdStageId,
        name: spec.name,
        workflowState: spec.workflowState,
      });
    }

    return {
      startedAt,
      completedAt: new Date().toISOString(),
      createdProject,
      createdStages,
      message:
        createdProject || createdStages.length > 0
          ? 'Odoo task sync prerequisites were provisioned.'
          : 'Odoo task sync prerequisites were already present.',
    };
  }

  async runWriteProbe(): Promise<OdooTaskWriteProbeResult> {
    const startedAt = new Date().toISOString();

    if (!this.odoo.isConfigured()) {
      return {
        startedAt,
        completedAt: new Date().toISOString(),
        probeTaskId: null,
        mirroredTaskId: null,
        taskTitle: null,
        finalStageName: null,
        message: 'Odoo service credentials are not configured.',
      };
    }

    const [projects, stages] = await Promise.all([
      this.odoo.searchRead<OdooProjectCandidate>(
        'project.project',
        [],
        ['name'],
        { limit: 1, order: 'id asc' },
      ),
      this.odoo.searchRead<OdooTaskStageCandidate>(
        'project.task.type',
        [],
        ['name', 'sequence', 'fold', 'project_ids'],
        { order: 'sequence asc, id asc' },
      ),
    ]);

    const defaultProject = projects[0];
    if (!defaultProject) {
      throw new BadRequestException('No default Odoo project is available for the write probe.');
    }

    const pendingStageId = chooseStageIdForWorkflowState(stages, 'pending', defaultProject.id);
    const doneStageId = chooseStageIdForWorkflowState(stages, 'done', defaultProject.id);
    const cancelledStageId = chooseStageIdForWorkflowState(stages, 'cancelled', defaultProject.id);

    if (!pendingStageId || !doneStageId) {
      throw new BadRequestException(
        'Odoo task probe requires standard pending and done stages for the default project.',
      );
    }

    const timestampLabel = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    const taskTitle = `[Bakki Sync Probe] ${timestampLabel}`;

    let probeTaskId: number | null = null;
    let mirroredTaskId: number | null = null;
    let finalStageName: string | null = null;

    try {
      probeTaskId = await this.odoo.executeKw<number>('project.task', 'create', [
        {
          name: taskTitle,
          project_id: defaultProject.id,
          stage_id: pendingStageId,
        },
      ]);

      const initialMirror = await this.tasksService.refreshMirrorForOdooTaskId(probeTaskId);
      mirroredTaskId = initialMirror?.id ?? null;

      await this.odoo.executeKw<boolean>('project.task', 'write', [
        [probeTaskId],
        { stage_id: doneStageId },
      ]);

      const doneMirror = await this.tasksService.refreshMirrorForOdooTaskId(probeTaskId);
      mirroredTaskId = doneMirror?.id ?? mirroredTaskId;
      finalStageName = doneMirror?.odooStageName ?? 'Done';

      if (cancelledStageId && cancelledStageId !== doneStageId) {
        await this.odoo.executeKw<boolean>('project.task', 'write', [
          [probeTaskId],
          { stage_id: cancelledStageId },
        ]);
        const cancelledMirror = await this.tasksService.refreshMirrorForOdooTaskId(probeTaskId);
        mirroredTaskId = cancelledMirror?.id ?? mirroredTaskId;
        finalStageName = cancelledMirror?.odooStageName ?? finalStageName;
      }

      return {
        startedAt,
        completedAt: new Date().toISOString(),
        probeTaskId,
        mirroredTaskId,
        taskTitle,
        finalStageName,
        message: mirroredTaskId
          ? 'Odoo write probe completed. A tagged probe task was created and synced into Bakki mirrors.'
          : 'Odoo write probe completed. A tagged probe task was created in Odoo, but no Bakki mirror was written because Bakki Core is not configured in this environment.',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Odoo write probe error';
      if (probeTaskId !== null) {
        await this.tasksService.markMirrorSyncFailure(probeTaskId, message);
      }
      throw new BadRequestException(`Odoo write probe failed: ${message}`);
    }
  }
}

const TASK_SYNC_STAGE_SPECS: Array<{
  fold: boolean;
  name: string;
  sequence: number;
  workflowState: BakkiWorkflowState;
}> = [
  { workflowState: 'pending', name: 'To Do', sequence: 10, fold: false },
  { workflowState: 'in_progress', name: 'In Progress', sequence: 50, fold: false },
  { workflowState: 'done', name: 'Done', sequence: 100, fold: true },
  { workflowState: 'cancelled', name: 'Cancelled', sequence: 110, fold: true },
];

function stageMatchesProject(stage: OdooTaskStageCandidate, projectId: number) {
  if (!Array.isArray(stage.project_ids) || stage.project_ids.length === 0) {
    return true;
  }

  return stage.project_ids.includes(projectId);
}
