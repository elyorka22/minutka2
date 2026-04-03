import {
  Body,
  Controller,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const user = await this.usersService.create({
      email: dto.email,
      password: dto.password,
      name: dto.name,
      phone: dto.phone,
      role: 'CUSTOMER',
    });
    return this.authService.login(user);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const email = dto.email.trim();
    const user = await this.authService.validateUser(email, dto.password);
    return this.authService.login(user);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken.trim());
  }

  @Post('logout')
  async logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken.trim());
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateMe(@Req() req: Request, @Body() dto: UpdateMeDto) {
    const user = (req as Request & { user?: { id: string } }).user;
    if (!user?.id) {
      throw new UnauthorizedException();
    }
    return this.authService.updateMyCredentials(user.id, dto);
  }
}

