import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsIn, IsNumber, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';
import type { BakkiTaskType } from '@bakki/domain';

const TASK_TYPES: BakkiTaskType[] = ['planting', 'monitoring', 'fertilizing'];

class PhaseAreaContractDto {
  @IsString()
  @MinLength(2)
  @MaxLength(128)
  areaId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(128)
  assignedUserProfileId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(128)
  speciesRef!: string;

  @Type(() => Number)
  @IsNumber()
  trayCount!: number;
}

export class CreatePlantingPhaseDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  phaseName!: string;

  @IsString()
  @MaxLength(32)
  startDate!: string;

  @IsString()
  @MaxLength(32)
  endDate!: string;

  @IsString()
  @MinLength(4)
  @MaxLength(4000)
  description!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(128)
  fieldLeadId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  participantIds!: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PhaseAreaContractDto)
  areaContracts!: PhaseAreaContractDto[];

  @IsOptional()
  @IsString()
  @MaxLength(255)
  crewRotation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  operationalNotes?: string;

  @IsOptional()
  @IsString()
  @IsIn(TASK_TYPES)
  taskType?: BakkiTaskType;
}
