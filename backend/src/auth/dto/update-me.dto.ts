import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

function emptyToUndefined(v: unknown): unknown {
  if (typeof v !== 'string') return v;
  const t = v.trim();
  return t === '' ? undefined : v;
}

export class UpdateMeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  currentPassword!: string;

  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MinLength(8)
  @MaxLength(200)
  newPassword?: string;

  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsEmail()
  @MaxLength(320)
  newEmail?: string;
}
