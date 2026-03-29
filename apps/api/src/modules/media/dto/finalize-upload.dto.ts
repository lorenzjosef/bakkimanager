import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class FinalizeUploadDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  objectKey!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fileName!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(255)
  mimeType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  caption?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  assetUrl?: string | null;
}
