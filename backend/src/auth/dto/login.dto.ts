import { IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  // Login may be a plain username or an email.
  @IsString()
  @MinLength(1)
  @MaxLength(320)
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  password!: string;
}
