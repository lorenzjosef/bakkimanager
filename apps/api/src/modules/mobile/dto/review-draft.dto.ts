import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ReviewDraftDto {
  @IsBoolean()
  approved!: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
