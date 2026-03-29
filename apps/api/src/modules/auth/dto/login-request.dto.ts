import { IsString, MinLength } from 'class-validator';

export class LoginRequestDto {
  @IsString()
  username!: string;

  @IsString()
  @MinLength(4)
  password!: string;
}
