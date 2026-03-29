import { IsString, MinLength } from 'class-validator';

export class ResetUserPasswordDto {
  @IsString()
  targetUserId!: string;

  @IsString()
  @MinLength(4)
  reason!: string;
}
