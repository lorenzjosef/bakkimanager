import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import type { CreateSpeciesRequest } from '@bakki/domain';

export class CreateSpeciesDto implements CreateSpeciesRequest {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  commonName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  botanicalName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  inventoryUnit?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  initialQuantityOnHand!: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  growthPhaseLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  areaTypeLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  treesPerTray?: number;
}
