import { Controller, Get, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { getRequestSessionToken } from '../auth/auth.service';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getHealth() {
    return this.healthService.getHealth();
  }

  @Get('odoo')
  getOdooDiagnostics() {
    return this.healthService.getOdooDiagnostics();
  }

  @Post('bakki-core/migrate')
  runBakkiCoreMigrations(@Req() request: Request) {
    return this.healthService.runBakkiCoreMigrations(getRequestSessionToken(request));
  }

  @Post('bakki-core/bootstrap')
  runBakkiCoreBootstrap(@Req() request: Request) {
    return this.healthService.runBakkiCoreBootstrap(getRequestSessionToken(request));
  }

  @Post('odoo/sync-now')
  runOdooSyncNow(@Req() request: Request) {
    return this.healthService.runOdooSyncNow(getRequestSessionToken(request));
  }

  @Post('odoo/task-write-probe')
  runOdooTaskWriteProbe(@Req() request: Request) {
    return this.healthService.runOdooTaskWriteProbe(getRequestSessionToken(request));
  }

  @Post('odoo/provision-task-sync')
  provisionOdooTaskSync(@Req() request: Request) {
    return this.healthService.provisionOdooTaskSync(getRequestSessionToken(request));
  }

  @Post('media/signing-probe')
  runMediaSigningProbe(@Req() request: Request) {
    return this.healthService.runMediaSigningProbe(getRequestSessionToken(request));
  }

  @Post('media/upload-probe')
  runMediaUploadProbe(@Req() request: Request) {
    return this.healthService.runMediaUploadProbe(getRequestSessionToken(request));
  }
}
