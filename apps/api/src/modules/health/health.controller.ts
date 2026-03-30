import { Controller, Get, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Public, OwnerOnly } from '../../common/decorators';
import { getRequestSessionToken } from '../auth/auth.service';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  getHealth() {
    return this.healthService.getHealth();
  }

  @Get('odoo')
  getOdooDiagnostics() {
    return this.healthService.getOdooDiagnostics();
  }

  @OwnerOnly()
  @Post('bakki-core/migrate')
  runBakkiCoreMigrations(@Req() request: Request) {
    return this.healthService.runBakkiCoreMigrations(getRequestSessionToken(request));
  }

  @OwnerOnly()
  @Post('bakki-core/bootstrap')
  runBakkiCoreBootstrap(@Req() request: Request) {
    return this.healthService.runBakkiCoreBootstrap(getRequestSessionToken(request));
  }

  @OwnerOnly()
  @Post('odoo/sync-now')
  runOdooSyncNow(@Req() request: Request) {
    return this.healthService.runOdooSyncNow(getRequestSessionToken(request));
  }

  @OwnerOnly()
  @Post('odoo/task-write-probe')
  runOdooTaskWriteProbe(@Req() request: Request) {
    return this.healthService.runOdooTaskWriteProbe(getRequestSessionToken(request));
  }

  @OwnerOnly()
  @Post('odoo/provision-task-sync')
  provisionOdooTaskSync(@Req() request: Request) {
    return this.healthService.provisionOdooTaskSync(getRequestSessionToken(request));
  }

  @OwnerOnly()
  @Post('media/signing-probe')
  runMediaSigningProbe(@Req() request: Request) {
    return this.healthService.runMediaSigningProbe(getRequestSessionToken(request));
  }

  @OwnerOnly()
  @Post('media/upload-probe')
  runMediaUploadProbe(@Req() request: Request) {
    return this.healthService.runMediaUploadProbe(getRequestSessionToken(request));
  }
}
