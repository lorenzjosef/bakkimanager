import { IsString, MaxLength } from 'class-validator';

export class LoginRequestDto {
  @IsString()
  @MaxLength(256)
  username!: string;

  @IsString()
  @MaxLength(256) // Prevent DoS via extremely long passwords
  password!: string;
}
