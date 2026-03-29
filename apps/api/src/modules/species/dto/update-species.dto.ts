import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import type { UpdateSpeciesRequest } from '@bakki/domain';

export class UpdateSpeciesDto implements UpdateSpeciesRequest {
  @IsString()
  @MinLength(1)
  commonName!: string;

  @IsString()
  @MinLength(1)
  botanicalName!: string;

  @IsOptional()
  @IsString()
  inventoryUnit?: string;

  @IsOptional()
  @IsString()
  growthPhaseLabel?: string;

  @IsOptional()
  @IsString()
  areaTypeLabel?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  treesPerTray?: number;
}
