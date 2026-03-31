import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { OwnerOnly } from '../../common/decorators';
import { getRequestSessionToken } from '../auth/auth.service';
import {
  CreateTreePlotDto,
  RecordTreePlotSampleDto,
  UpdateTreePlotDto,
} from './dto';
import { TreeSurveysService } from './tree-surveys.service';

@Controller('tree-surveys')
export class TreeSurveysController {
  constructor(private readonly treeSurveysService: TreeSurveysService) {}

  @Get('plots')
  async listPlots(@Query('ranchId') ranchId?: string) {
    return {
      plots: await this.treeSurveysService.listPlots(ranchId),
    };
  }

  @Get('plots/:plotId')
  getPlot(@Param('plotId') plotId: string) {
    return this.treeSurveysService.getPlot(plotId);
  }

  @OwnerOnly()
  @Post('plots')
  createPlot(
    @Body() body: CreateTreePlotDto,
    @Req() request: Request,
  ) {
    return this.treeSurveysService.createPlot(
      body,
      getRequestSessionToken(request),
    );
  }

  @OwnerOnly()
  @Patch('plots/:plotId')
  updatePlot(
    @Param('plotId') plotId: string,
    @Body() body: UpdateTreePlotDto,
    @Req() request: Request,
  ) {
    return this.treeSurveysService.updatePlot(
      plotId,
      body,
      getRequestSessionToken(request),
    );
  }

  @Get('plots/:plotId/samples')
  async listSamples(@Param('plotId') plotId: string) {
    return {
      samples: await this.treeSurveysService.listSamples(plotId),
    };
  }

  @OwnerOnly()
  @Post('plots/:plotId/samples')
  recordSample(
    @Param('plotId') plotId: string,
    @Body() body: RecordTreePlotSampleDto,
    @Req() request: Request,
  ) {
    return this.treeSurveysService.recordSample(
      plotId,
      body,
      getRequestSessionToken(request),
    );
  }

  @Get('rollups/areas')
  async getAreaRollups(@Query('ids') ids?: string) {
    return {
      rollups: await this.treeSurveysService.getAreaRollups(parseCsvQuery(ids)),
    };
  }

  @Get('rollups/zones')
  async getZoneRollups(@Query('ids') ids?: string) {
    return {
      rollups: await this.treeSurveysService.getZoneRollups(parseCsvQuery(ids)),
    };
  }
}

function parseCsvQuery(value?: string) {
  return (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}
