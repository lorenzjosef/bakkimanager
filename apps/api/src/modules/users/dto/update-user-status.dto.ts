import { IsBoolean } from 'class-validator';
import type { UpdateUserStatusRequest } from '@bakki/domain';

export class UpdateUserStatusDto implements UpdateUserStatusRequest {
  @IsBoolean()
  active!: boolean;
}
