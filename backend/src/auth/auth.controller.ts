import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';

class LoginDto {
  email: string;
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  async register(@Body() dto: CreateUserDto) {
    const user = await this.usersService.create(dto);
    return this.authService.login(user);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const email = typeof dto.email === 'string' ? dto.email.trim() : '';
    const password = typeof dto.password === 'string' ? dto.password : '';
    if (!email) throw new BadRequestException('email is required');
    const user = await this.authService.validateUser(email, password);
    return this.authService.login(user);
  }
}

