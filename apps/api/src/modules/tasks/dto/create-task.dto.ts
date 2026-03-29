import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { BakkiTaskPriority, BakkiTaskType } from '@bakki/domain';

const TASK_TYPES: BakkiTaskType[] = ['planting', 'monitoring', 'fertilizing'];
const TASK_PRIORITIES: BakkiTaskPriority[] = ['0', '1', '2', '3'];

export class CreateTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  templateRef?: string;

  @IsString()
  @IsIn(TASK_TYPES)
  taskType!: BakkiTaskType;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  areaId?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(255)
  areaLabel!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  assigneeLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  assigneeProfileId?: string;

  @IsOptional()
  @IsString()
  @IsIn(TASK_PRIORITIES)
  priority?: BakkiTaskPriority;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  dueDate?: string;

  @IsString()
  @MinLength(4)
  @MaxLength(4000)
  description!: string;
}
