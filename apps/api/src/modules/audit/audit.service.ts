import { Injectable, Logger } from '@nestjs/common';
import { BakkiAuditLogService } from '../../bakki-core/bakki-audit-log.service';

export interface AuditEventRecord {
  actor: string;
  id: string;
  message: string;
  timestamp: string;
  type: string;
}

export interface RecordAuditEventInput {
  actor: string;
  ipAddress?: string;
  message: string;
  payload?: Record<string, unknown>;
  targetModel?: string;
  targetResId?: number;
  type: string;
}

@Injectable()
export class AuditService {
  private static readonly MAX_IN_MEMORY_EVENTS = 500;
  private readonly logger = new Logger(AuditService.name);
  private readonly events: AuditEventRecord[] = [
    {
      id: 'audit-bootstrap-1',
      type: 'system',
      actor: 'system',
      message: 'API scaffold initialized',
      timestamp: new Date().toISOString(),
    },
  ];

  constructor(private readonly bakkiAuditLog: BakkiAuditLogService) {}

  async listEvents() {
    if (!this.bakkiAuditLog.isConfigured()) {
      return this.events;
    }

    try {
      return await this.bakkiAuditLog.listRecent(100);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown audit read error';
      this.logger.warn(`Falling back to in-memory audit events: ${message}`);
      return this.events;
    }
  }

  async recordEvent(event: RecordAuditEventInput) {
    this.events.unshift({
      actor: event.actor,
      id: `audit-${this.events.length + 1}`,
      message: event.message,
      timestamp: new Date().toISOString(),
      type: event.type,
    });

    // Prevent unbounded memory growth by trimming old events
    if (this.events.length > AuditService.MAX_IN_MEMORY_EVENTS) {
      this.events.length = AuditService.MAX_IN_MEMORY_EVENTS;
    }

    if (!this.bakkiAuditLog.isConfigured()) {
      return;
    }

    try {
      await this.bakkiAuditLog.create(event);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown audit write error';
      this.logger.warn(
        `Failed to persist audit event to Bakki Core [type=${event.type}, target=${event.targetModel ?? 'n/a'}:${event.targetResId ?? 'n/a'}]: ${message}`,
      );
    }
  }
}
