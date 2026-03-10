import {
  Body,
  Controller,
  Get,
  Patch,
  Param,
  Req,
  UseGuards,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PrismaService } from './prisma.service';

interface RequestWithUser {
  user?: { id: string; role: string };
}

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('overview')
  async overview(@Req() req: RequestWithUser) {
    if (req.user?.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Only platform admin allowed');
    }

    const [restaurants, users, recentOrders] = await Promise.all([
      this.prisma.restaurant.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          restaurant: true,
          customer: { select: { id: true, email: true, name: true } },
        },
      }),
    ]);

    return {
      restaurants,
      users,
      recentOrders,
    };
  }

  @Patch('users/:id/role')
  async updateUserRole(
    @Param('id') id: string,
    @Body() body: { role?: string },
    @Req() req: RequestWithUser,
  ) {
    if (req.user?.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Only platform admin allowed');
    }

    const allowedRoles = ['CUSTOMER', 'RESTAURANT_ADMIN', 'PLATFORM_ADMIN', 'COURIER'];
    const role = body.role;

    if (!role || !allowedRoles.includes(role)) {
      throw new BadRequestException('Invalid role');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: { role },
    });

    return user;
  }
}
