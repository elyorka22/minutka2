import { Body, Controller, ForbiddenException, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface RequestWithUser {
  user?: { id: string; role: string };
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() dto: CreateUserDto, @Req() req: RequestWithUser) {
    if (req.user?.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Only platform admin allowed');
    }
    const created = await this.usersService.create(dto);
    return this.usersService.findSafeById(created.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    const isSelf = req.user?.id === id;
    const isPlatformAdmin = req.user?.role === 'PLATFORM_ADMIN';
    if (!isSelf && !isPlatformAdmin) {
      throw new ForbiddenException('Forbidden');
    }
    return this.usersService.findSafeById(id);
  }
}

