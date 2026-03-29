import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { UserRoleDesignation } from '@bakki/domain';

const USER_ROLES: UserRoleDesignation[] = ['owner', 'planter'];

export class CreateUserDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  firstName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  lastName!: string;

  @IsString()
  @IsIn(USER_ROLES)
  role!: UserRoleDesignation;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  temporaryPassword?: string;
}
