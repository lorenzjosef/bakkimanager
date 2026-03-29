import { Injectable } from '@nestjs/common';
import {
  type BakkiTaskType,
  taskTemplateSummariesFixture,
  type TaskTemplateSummary,
} from '@bakki/domain';
import { BakkiCoreService } from './bakki-core.service';
import { ensureSchemaInitialized } from './schema-init.utils';

interface TaskTemplateRow {
  checklist_item_count: number | string;
  default_priority: number | string;
  description: string;
  label: string;
  task_type: BakkiTaskType;
  template_ref: string;
  youtube_url: string | null;
}

@Injectable()
export class BakkiTaskTemplateService {
  private schemaEnsured = false;
  private schemaInitPromise: Promise<void> | null = null;

  constructor(private readonly bakkiCore: BakkiCoreService) {}

  isConfigured() {
    return this.bakkiCore.isConfigured();
  }

  async ensureSchema() {
    await ensureSchemaInitialized({
      getSchemaInitPromise: () => this.schemaInitPromise,
      initialize: () => this.ensureSchemaInternal(),
      isConfigured: this.bakkiCore.isConfigured(),
      schemaEnsured: this.schemaEnsured,
      setSchemaInitPromise: (promise) => {
        this.schemaInitPromise = promise;
      },
    });
  }

  private async ensureSchemaInternal() {
    await this.bakkiCore.query(`
      create table if not exists bakki_task_template (
        template_ref text primary key,
        task_type text not null check (task_type in ('planting', 'monitoring', 'fertilizing')),
        label text not null,
        description text not null,
        youtube_url text,
        checklist_item_count integer not null default 0,
        default_priority integer not null default 2,
        active boolean not null default true,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    `);

    await this.bakkiCore.query(`
      create index if not exists bakki_task_template_task_type_idx
      on bakki_task_template (task_type)
    `);

    for (const template of taskTemplateSummariesFixture) {
      await this.bakkiCore.query(
        `
          insert into bakki_task_template (
            template_ref,
            task_type,
            label,
            description,
            youtube_url,
            checklist_item_count,
            default_priority,
            active,
            updated_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, true, now())
          on conflict (template_ref)
          do update set
            task_type = excluded.task_type,
            label = excluded.label,
            description = excluded.description,
            youtube_url = excluded.youtube_url,
            checklist_item_count = excluded.checklist_item_count,
            default_priority = excluded.default_priority,
            updated_at = now()
        `,
        [
          template.templateRef,
          template.taskType,
          template.label,
          template.description,
          template.youtubeUrl,
          template.checklistItemCount,
          template.defaultPriority,
        ],
      );
    }

    this.schemaEnsured = true;
  }

  async listActive() {
    if (!this.bakkiCore.isConfigured()) {
      return [...taskTemplateSummariesFixture];
    }

    try {
      await this.ensureSchema();
      const result = await this.bakkiCore.query<TaskTemplateRow>(
        `
          select
            template_ref,
            task_type,
            label,
            description,
            youtube_url,
            checklist_item_count,
            default_priority
          from bakki_task_template
          where active = true
          order by default_priority desc, template_ref asc
        `,
      );

      return result.rows.map(mapTaskTemplateRow);
    } catch {
      return [...taskTemplateSummariesFixture];
    }
  }

  async getByRef(templateRef: string) {
    if (!templateRef.trim()) {
      return null;
    }

    if (!this.bakkiCore.isConfigured()) {
      return taskTemplateSummariesFixture.find((template) => template.templateRef === templateRef.trim()) ?? null;
    }

    try {
      await this.ensureSchema();
      const result = await this.bakkiCore.query<TaskTemplateRow>(
        `
          select
            template_ref,
            task_type,
            label,
            description,
            youtube_url,
            checklist_item_count,
            default_priority
          from bakki_task_template
          where template_ref = $1
            and active = true
          limit 1
        `,
        [templateRef],
      );

      return result.rows[0] ? mapTaskTemplateRow(result.rows[0]) : null;
    } catch {
      return taskTemplateSummariesFixture.find((template) => template.templateRef === templateRef.trim()) ?? null;
    }
  }

  async getDefaultByTaskType(taskType: BakkiTaskType) {
    if (!this.bakkiCore.isConfigured()) {
      return taskTemplateSummariesFixture.find((template) => template.taskType === taskType) ?? null;
    }

    try {
      await this.ensureSchema();
      const result = await this.bakkiCore.query<TaskTemplateRow>(
        `
          select
            template_ref,
            task_type,
            label,
            description,
            youtube_url,
            checklist_item_count,
            default_priority
          from bakki_task_template
          where task_type = $1
            and active = true
          order by default_priority desc, template_ref asc
          limit 1
        `,
        [taskType],
      );

      return result.rows[0] ? mapTaskTemplateRow(result.rows[0]) : null;
    } catch {
      return taskTemplateSummariesFixture.find((template) => template.taskType === taskType) ?? null;
    }
  }
}

function mapTaskTemplateRow(row: TaskTemplateRow): TaskTemplateSummary {
  return {
    templateRef: row.template_ref,
    taskType: row.task_type,
    label: row.label,
    description: row.description,
    youtubeUrl: row.youtube_url,
    checklistItemCount: Number(row.checklist_item_count),
    defaultPriority: Number(row.default_priority),
  };
}
