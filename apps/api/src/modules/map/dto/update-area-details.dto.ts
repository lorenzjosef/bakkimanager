import { IsOptional, IsString } from 'class-validator';
import type { UpdateAreaDetailsRequest } from '@bakki/domain';

export class UpdateAreaDetailsDto implements UpdateAreaDetailsRequest {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  speciesRef?: string | null;
}
