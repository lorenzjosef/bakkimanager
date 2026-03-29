import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { getRequestSessionToken } from '../auth/auth.service';
import { AdjustSpeciesInventoryDto } from './dto/adjust-species-inventory.dto';
import { CreateSpeciesDto } from './dto/create-species.dto';
import { UpdateSpeciesDto } from './dto/update-species.dto';
import { SpeciesService } from './species.service';

@Controller('species')
export class SpeciesController {
  constructor(private readonly speciesService: SpeciesService) {}

  @Get()
  async listSpecies() {
    return {
      species: await this.speciesService.listSpecies(),
    };
  }

  @Get('sync-status')
  getSyncStatus() {
    return this.speciesService.getSyncStatus();
  }

  @Post()
  createSpecies(@Body() body: CreateSpeciesDto, @Req() request: Request) {
    return this.speciesService.createSpecies(body, getRequestSessionToken(request));
  }

  @Get(':id')
  getSpeciesDetail(@Param('id') id: string) {
    return this.speciesService.getDetail(id);
  }

  @Patch(':id')
  updateSpecies(
    @Param('id') id: string,
    @Body() body: UpdateSpeciesDto,
    @Req() request: Request,
  ) {
    return this.speciesService.updateSpecies(id, body, getRequestSessionToken(request));
  }

  @Post(':id/inventory-adjustments')
  adjustInventory(
    @Param('id') id: string,
    @Body() body: AdjustSpeciesInventoryDto,
    @Req() request: Request,
  ) {
    return this.speciesService.adjustInventory(id, body, getRequestSessionToken(request));
  }
}
