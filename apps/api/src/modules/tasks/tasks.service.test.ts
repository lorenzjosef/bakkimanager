import assert from 'node:assert/strict';
import test from 'node:test';
import { taskTemplateSummariesFixture } from '@bakki/domain';
import { TasksService } from './tasks.service';

function createTasksService(overrides?: {
  bakkiTasks?: {
    countByWorkflowStates?: (states: string[]) => Promise<number>;
    countDueOn?: (date: string) => Promise<number>;
    isConfigured?: () => boolean;
    listRecent?: (limit: number) => Promise<unknown[]>;
  };
  odoo?: {
    isConfigured?: () => boolean;
    searchCount?: (model: string, domain: unknown[]) => Promise<number>;
    searchRead?: <T>() => Promise<T[]>;
  };
}) {
  return new TasksService(
    {
      listByAreaRefs: async () => [],
      upsertMetrics: async () => null,
    } as never,
    {
      getAreasByRefs: async () => new Map(),
      isConfigured: () => false,
    } as never,
    {
      recordEvent: async () => {},
    } as never,
    {
      getSession: async () => ({ session: null }),
      revokeSessionsForUserId: () => {},
      revokeSessionsForUsername: () => {},
    } as never,
    {
      countByWorkflowStates:
        overrides?.bakkiTasks?.countByWorkflowStates
        ?? (async () => 0),
      countDueOn:
        overrides?.bakkiTasks?.countDueOn
        ?? (async () => 0),
      getByOdooTaskId: async () => null,
      isConfigured:
        overrides?.bakkiTasks?.isConfigured
        ?? (() => false),
      listByOdooTaskIds: async () => new Map(),
      listErroredOdooTaskIds: async () => [],
      listRecent:
        overrides?.bakkiTasks?.listRecent
        ?? (async () => []),
      markSyncFailureByOdooTaskId: async () => null,
      upsert: async () => null,
    } as never,
    {
      getByRef: async (templateRef: string) => (
        taskTemplateSummariesFixture.find((template) => template.templateRef === templateRef) ?? null
      ),
      getDefaultByTaskType: async (taskType: string) => (
        taskTemplateSummariesFixture.find((template) => template.taskType === taskType) ?? null
      ),
      isConfigured: () => false,
      listActive: async () => taskTemplateSummariesFixture,
    } as never,
    {
      getPlot: async () => null,
      isConfigured: () => false,
      listPlots: async () => [],
      recordSample: async () => {
        throw new Error('not used in this test');
      },
    } as never,
    {
      getById: async () => null,
      isConfigured: () => false,
    } as never,
    {
      create: async () => null,
    } as never,
    {
      isConfigured:
        overrides?.odoo?.isConfigured
        ?? (() => false),
      searchCount:
        overrides?.odoo?.searchCount
        ?? (async () => 0),
      searchRead:
        overrides?.odoo?.searchRead
        ?? (async <T>() => [] as T[]),
    } as never,
  );
}

test('getSummary returns an honest empty live state when Bakki task mirrors are configured but empty', async () => {
  const service = createTasksService({
    bakkiTasks: {
      isConfigured: () => true,
      countByWorkflowStates: async () => 0,
      countDueOn: async () => 0,
      listRecent: async () => [],
    },
  });

  const summary = await service.getSummary();

  assert.deepEqual(summary.rows, []);
  assert.equal(summary.activeTasks, '0');
  assert.equal(summary.dueToday, '0');
});

test('getSummary returns an honest empty live state when Odoo is configured but returns no tasks', async () => {
  const service = createTasksService({
    odoo: {
      isConfigured: () => true,
      searchCount: async () => 0,
      searchRead: async <T>() => [] as T[],
    },
  });

  const summary = await service.getSummary();

  assert.deepEqual(summary.rows, []);
  assert.equal(summary.activeTasks, '0');
  assert.equal(summary.dueToday, '0');
});

test('getSummary returns an empty structured state when neither live task backend is configured', async () => {
  const service = createTasksService();

  const summary = await service.getSummary();

  assert.deepEqual(summary.rows, []);
  assert.equal(summary.activeTasks, '0');
  assert.equal(summary.dueToday, '0');
});

test('getTemplates returns canonical template summaries when task templates are unavailable', async () => {
  const service = createTasksService();

  const templates = await service.getTemplates();

  assert.deepEqual(templates, taskTemplateSummariesFixture);
});
