import {
  Body,
  Controller,
  Get,
  Patch,
  Param,
  Post,
  Req,
  UseGuards,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PrismaService } from './prisma.service';
import { UserRole } from '../generated/prisma/enums';

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
    @Body() body: { role?: UserRole },
    @Req() req: RequestWithUser,
  ) {
    if (req.user?.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Only platform admin allowed');
    }

    const allowedRoles: UserRole[] = [
      UserRole.CUSTOMER,
      UserRole.RESTAURANT_ADMIN,
      UserRole.PLATFORM_ADMIN,
      UserRole.COURIER,
    ];
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

  @Post('restaurants')
  async createRestaurant(
    @Body()
    body: {
      name: string;
      description?: string;
      address?: string;
      logoUrl?: string;
      coverUrl?: string;
      deliveryFee?: number;
      minOrderTotal?: number;
      deliveryRadiusM?: number;
      latitude?: number;
      longitude?: number;
    },
    @Req() req: RequestWithUser,
  ) {
    if (req.user?.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Only platform admin allowed');
    }
    if (!body.name || typeof body.name !== 'string') {
      throw new BadRequestException('name is required');
    }
    const restaurant = await this.prisma.restaurant.create({
      data: {
        name: body.name.trim(),
        description: body.description?.trim() ?? null,
        address: body.address?.trim() ?? '',
        logoUrl: body.logoUrl?.trim() ?? null,
        coverUrl: body.coverUrl?.trim() ?? null,
        deliveryFee: body.deliveryFee ?? 0,
        minOrderTotal: body.minOrderTotal ?? 0,
        deliveryRadiusM: body.deliveryRadiusM ?? 3000,
        latitude: body.latitude ?? 0,
        longitude: body.longitude ?? 0,
      },
    });
    return restaurant;
  }

  @Get('restaurants/:id/full')
  async getRestaurantFull(@Param('id') id: string, @Req() req: RequestWithUser) {
    if (req.user?.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Only platform admin allowed');
    }
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      include: {
        categories: { orderBy: { sortOrder: 'asc' }, include: { dishes: true } },
        dishes: true,
      },
    });
    if (!restaurant) throw new BadRequestException('Restaurant not found');
    return restaurant;
  }

  @Post('restaurants/:id/categories')
  async createCategory(
    @Param('id') id: string,
    @Body() body: { name: string; sortOrder?: number },
    @Req() req: RequestWithUser,
  ) {
    if (req.user?.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Only platform admin allowed');
    }
    if (!body.name || typeof body.name !== 'string') {
      throw new BadRequestException('name is required');
    }
    const category = await this.prisma.category.create({
      data: {
        restaurantId: id,
        name: body.name.trim(),
        sortOrder: body.sortOrder ?? 0,
      },
    });
    return category;
  }

  @Post('restaurants/:id/dishes')
  async createDish(
    @Param('id') id: string,
    @Body()
    body: {
      name: string;
      description?: string;
      price: number;
      categoryId?: string;
      imageUrl?: string;
    },
    @Req() req: RequestWithUser,
  ) {
    if (req.user?.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Only platform admin allowed');
    }
    if (!body.name || typeof body.name !== 'string') {
      throw new BadRequestException('name is required');
    }
    if (typeof body.price !== 'number' || body.price < 0) {
      throw new BadRequestException('price must be a non-negative number');
    }
    const dish = await this.prisma.dish.create({
      data: {
        restaurantId: id,
        name: body.name.trim(),
        description: body.description?.trim() ?? null,
        price: body.price,
        categoryId: body.categoryId?.trim() || null,
        imageUrl: body.imageUrl?.trim() ?? null,
      },
    });
    return dish;
  }
}
