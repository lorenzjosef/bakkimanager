import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { OwnerOnly } from '../../common/decorators';
import { getRequestSessionToken } from '../auth/auth.service';
import { CreatePlantingPhaseDto } from './dto/create-phase.dto';
import { PhasesService } from './phases.service';

@Controller('phases')
export class PhasesController {
  constructor(private readonly phasesService: PhasesService) {}

  @Get('overview')
  getOverview() {
    return this.phasesService.getOverview();
  }

  @Get('wizard')
  getWizardData() {
    return this.phasesService.getWizardData();
  }

  @OwnerOnly()
  @Post()
  createPhase(@Body() body: CreatePlantingPhaseDto, @Req() request: Request) {
    const sessionToken = getRequestSessionToken(request);
    return this.phasesService.createPhase(body, sessionToken);
  }
}
