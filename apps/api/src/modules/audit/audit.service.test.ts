import assert from 'node:assert/strict';
import test from 'node:test';
import type { RecordAuditEventInput } from './audit.service';
import { AuditService } from './audit.service';

function createAuditService(options?: {
  configured?: boolean;
  createImpl?: (event: RecordAuditEventInput) => Promise<unknown>;
  listRecentImpl?: (limit?: number) => Promise<Array<{
    actor: string;
    id: string;
    message: string;
    timestamp: string;
    type: string;
  }>>;
}) {
  const createdEvents: RecordAuditEventInput[] = [];

  const service = new AuditService({
    isConfigured: () => options?.configured ?? false,
    create: async (event: RecordAuditEventInput) => {
      createdEvents.push(event);
      if (options?.createImpl) {
        return options.createImpl(event);
      }
      return {
        id: 'audit-remote-1',
        actor: event.actor,
        type: event.type,
        message: event.message,
        timestamp: '2026-03-28T10:00:00.000Z',
      };
    },
    listRecent: async (limit?: number) => {
      if (options?.listRecentImpl) {
        return options.listRecentImpl(limit);
      }
      return [];
    },
  } as never);

  return { service, createdEvents };
}

test('recordEvent keeps an in-memory audit trail when Bakki Core persistence is disabled', async () => {
  const { service, createdEvents } = createAuditService({ configured: false });

  await service.recordEvent({
    actor: 'owner-1',
    message: 'Created task 42',
    targetModel: 'project.task',
    targetResId: 42,
    type: 'task.create',
  });

  assert.equal(createdEvents.length, 0);
  const events = await service.listEvents();
  assert.equal(events[0]?.type, 'task.create');
  assert.equal(events[0]?.message, 'Created task 42');
  assert.equal(events[0]?.actor, 'owner-1');
});

test('recordEvent forwards Bakki Core-backed audit writes when persistence is enabled', async () => {
  const { service, createdEvents } = createAuditService({ configured: true });

  await service.recordEvent({
    actor: 'owner-2',
    ipAddress: '127.0.0.1',
    message: 'Updated area metrics for Area 3',
    payload: { densityPer100Sqm: 82 },
    targetModel: 'bakki_area',
    targetResId: 3,
    type: 'area.metrics_update',
  });

  assert.equal(createdEvents.length, 1);
  assert.deepEqual(createdEvents[0], {
    actor: 'owner-2',
    ipAddress: '127.0.0.1',
    message: 'Updated area metrics for Area 3',
    payload: { densityPer100Sqm: 82 },
    targetModel: 'bakki_area',
    targetResId: 3,
    type: 'area.metrics_update',
  });
});

test('listEvents falls back to the in-memory audit trail when Bakki Core reads fail', async () => {
  const { service } = createAuditService({
    configured: true,
    listRecentImpl: async () => {
      throw new Error('db unavailable');
    },
  });

  await service.recordEvent({
    actor: 'owner-3',
    message: 'Created phase North Spring Push',
    targetModel: 'bakki_phase',
    targetResId: 11,
    type: 'phase.create',
  });

  const events = await service.listEvents();
  assert.equal(events[0]?.type, 'phase.create');
  assert.equal(events[0]?.message, 'Created phase North Spring Push');
});
