import {
  Body,
  Controller,
  Get,
  Patch,
  Param,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PrismaService } from './prisma.service';
import { UserRole } from '../generated/prisma/enums';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

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

  private static readonly ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  private static readonly MAX_SIZE = 5 * 1024 * 1024; // 5MB

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string; size: number } | undefined,
    @Req() req: RequestWithUser & { protocol?: string; get?(name: string): string },
  ) {
    if (req.user?.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Only platform admin allowed');
    }
    if (!file || !file.buffer) {
      throw new BadRequestException('File is required');
    }
    if (!AdminController.ALLOWED_MIMES.includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, WebP, GIF allowed');
    }
    if (file.size > AdminController.MAX_SIZE) {
      throw new BadRequestException('Max size 5MB');
    }
    const ext = path.extname(file.originalname) || (file.mimetype === 'image/png' ? '.png' : file.mimetype === 'image/webp' ? '.webp' : file.mimetype === 'image/gif' ? '.gif' : '.jpg');
    const filename = randomUUID() + ext;
    const uploadsDir = path.join(process.cwd(), 'uploads');
    fs.mkdirSync(uploadsDir, { recursive: true });
    fs.writeFileSync(path.join(uploadsDir, filename), file.buffer);
    const header = (name: string) => (req.get ? req.get(name) : undefined);
    const forwardedProto = header('x-forwarded-proto')?.split(',')[0]?.trim();
    const forwardedHost = header('x-forwarded-host')?.split(',')[0]?.trim();
    const host = forwardedHost || header('host')?.split(',')[0]?.trim();
    const protocol = forwardedProto || req.protocol;
    const inferredBase = protocol && host ? `${protocol}://${host}` : '';
    const baseUrl = process.env.PUBLIC_API_URL || inferredBase;
    const url = baseUrl ? `${baseUrl.replace(/\/$/, '')}/uploads/${filename}` : `/uploads/${filename}`;
    return { url };
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

  @Patch('restaurants/:id')
  async updateRestaurant(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      address?: string;
      logoUrl?: string;
      coverUrl?: string;
      deliveryFee?: number;
      minOrderTotal?: number;
      deliveryRadiusM?: number;
    },
    @Req() req: RequestWithUser,
  ) {
    if (req.user?.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Only platform admin allowed');
    }
    const restaurant = await this.prisma.restaurant.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.description !== undefined && { description: body.description?.trim() ?? null }),
        ...(body.address !== undefined && { address: body.address?.trim() ?? '' }),
        ...(body.logoUrl !== undefined && { logoUrl: body.logoUrl?.trim() ?? null }),
        ...(body.coverUrl !== undefined && { coverUrl: body.coverUrl?.trim() ?? null }),
        ...(body.deliveryFee !== undefined && { deliveryFee: body.deliveryFee }),
        ...(body.minOrderTotal !== undefined && { minOrderTotal: body.minOrderTotal }),
        ...(body.deliveryRadiusM !== undefined && { deliveryRadiusM: body.deliveryRadiusM }),
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

  @Post('products')
  async createProduct(
    @Body()
    body: {
      name: string;
      description?: string;
      price: number;
      unit?: string;
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
    if (typeof body.price !== 'number' || body.price <= 0) {
      throw new BadRequestException('price must be a positive number');
    }
    const product = await this.prisma.product.create({
      data: {
        name: body.name.trim(),
        description: body.description?.trim() ?? null,
        price: body.price,
        unit: body.unit?.trim() || 'dona',
        imageUrl: body.imageUrl?.trim() ?? null,
      },
    });
    return product;
  }
}
