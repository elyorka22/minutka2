import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const ROLES = ['CUSTOMER', 'RESTAURANT_ADMIN', 'PLATFORM_ADMIN', 'COURIER'] as const;

export class CreateUserDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(200)
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsIn([...ROLES])
  role?: (typeof ROLES)[number];
}
