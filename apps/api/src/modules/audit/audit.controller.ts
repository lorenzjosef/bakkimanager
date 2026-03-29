import { Controller, Get } from '@nestjs/common';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('events')
  async listEvents() {
    return {
      events: await this.auditService.listEvents(),
    };
  }
}
