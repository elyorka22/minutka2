import {
  Body,
  Controller,
  Get,
  Patch,
  Param,
  Post,
  Delete,
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
import { UsersService } from './users/users.service';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  @Get('my-restaurants')
  async myRestaurants(@Req() req: RequestWithUser) {
    const userId = req.user?.id;
    if (!userId) {
      throw new ForbiddenException('Unauthorized');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        restaurants: { where: { isActive: true }, orderBy: { name: 'asc' } },
      },
    });
    if (!user) throw new ForbiddenException('User not found');
    return user.restaurants ?? [];
  }

  @Get('overview')
  async overview(@Req() req: RequestWithUser) {
    if (req.user?.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Only platform admin allowed');
    }

    const [restaurants, users, recentOrders, banners, productCategories] = await Promise.all([
      this.prisma.restaurant.findMany({
        where: { isActive: true },
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
      this.prisma.banner.findMany({
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.productCategory.findMany({
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
    ]);

    return {
      restaurants,
      users,
      recentOrders,
      banners,
      productCategories,
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
      isSupermarket?: boolean;
      platformFeePercent?: number;
      adminEmail: string;
      adminPassword: string;
      adminName: string;
    },
    @Req() req: RequestWithUser,
  ) {
    if (req.user?.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Only platform admin allowed');
    }
    if (!body.name || typeof body.name !== 'string') {
      throw new BadRequestException('name is required');
    }
    const adminEmail = typeof body.adminEmail === 'string' ? body.adminEmail.trim() : '';
    const adminPassword = typeof body.adminPassword === 'string' ? body.adminPassword : '';
    const adminName = typeof body.adminName === 'string' ? body.adminName.trim() : '';
    if (!adminEmail) {
      throw new BadRequestException('adminEmail is required');
    }
    if (!adminPassword || adminPassword.length < 6) {
      throw new BadRequestException('adminPassword is required (min 6 characters)');
    }
    if (!adminName) {
      throw new BadRequestException('adminName is required');
    }

    let adminId: string;
    const existingUser = await this.usersService.findByEmail(adminEmail);
    if (existingUser) {
      await this.prisma.user.update({
        where: { id: existingUser.id },
        data: { role: UserRole.RESTAURANT_ADMIN },
      });
      adminId = existingUser.id;
    } else {
      const newUser = await this.usersService.create({
        email: adminEmail,
        password: adminPassword,
        name: adminName,
        role: 'RESTAURANT_ADMIN',
      });
      adminId = newUser.id;
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
        isSupermarket: !!body.isSupermarket,
        platformFeePercent: body.platformFeePercent != null ? Number(body.platformFeePercent) : 10,
        admins: { connect: [{ id: adminId }] },
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
      isFeatured?: boolean;
      featuredSortOrder?: number;
      platformFeePercent?: number;
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
        ...(body.isFeatured !== undefined && { isFeatured: body.isFeatured }),
        ...(body.featuredSortOrder !== undefined && { featuredSortOrder: body.featuredSortOrder }),
        ...(body.platformFeePercent !== undefined && { platformFeePercent: Number(body.platformFeePercent) }),
      },
    });
    return restaurant;
  }

  @Delete('restaurants/:id')
  async deleteRestaurant(@Param('id') id: string, @Req() req: RequestWithUser) {
    if (req.user?.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Only platform admin allowed');
    }
    try {
      // Пытаемся полностью удалить ресторан из БД
      const restaurant = await this.prisma.restaurant.delete({
        where: { id },
      });
      return restaurant;
    } catch (e: any) {
      // Если есть связанные заказы и срабатывает ограничение внешнего ключа,
      // просто помечаем ресторан как неактивный, чтобы скрыть его отовсюду.
      if (e && e.code === 'P2003') {
        const restaurant = await this.prisma.restaurant.update({
          where: { id },
          data: { isActive: false },
        });
        return restaurant;
      }
      throw e;
    }
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

  @Delete('restaurants/:id/categories/:categoryId')
  async deleteCategory(
    @Param('id') restaurantId: string,
    @Param('categoryId') categoryId: string,
    @Req() req: RequestWithUser,
  ) {
    if (req.user?.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Only platform admin allowed');
    }
    await this.prisma.dish.updateMany({
      where: { restaurantId, categoryId },
      data: { categoryId: null },
    });
    await this.prisma.category.delete({
      where: { id: categoryId },
    });
    return { ok: true };
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

  @Delete('restaurants/:id/dishes/:dishId')
  async deleteDish(
    @Param('id') restaurantId: string,
    @Param('dishId') dishId: string,
    @Req() req: RequestWithUser,
  ) {
    if (req.user?.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Only platform admin allowed');
    }
    await this.prisma.dish.delete({
      where: { id: dishId },
    });
    return { ok: true };
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
      categoryId?: string;
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
        categoryId: body.categoryId?.trim() || null,
      },
    });
    return product;
  }

  @Get('product-categories')
  async getProductCategories(@Req() req: RequestWithUser) {
    if (req.user?.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Only platform admin allowed');
    }
    return this.prisma.productCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  @Post('product-categories')
  async createProductCategory(
    @Body() body: { name: string; imageUrl?: string; sortOrder?: number; isActive?: boolean },
    @Req() req: RequestWithUser,
  ) {
    if (req.user?.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Only platform admin allowed');
    }
    if (!body.name || typeof body.name !== 'string') {
      throw new BadRequestException('name is required');
    }
    const category = await this.prisma.productCategory.create({
      data: {
        name: body.name.trim(),
        imageUrl: body.imageUrl?.trim() ?? null,
        sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : 0,
        isActive: body.isActive ?? true,
      },
    });
    return category;
  }

  @Patch('product-categories/:id')
  async updateProductCategory(
    @Param('id') id: string,
    @Body() body: { name?: string; imageUrl?: string; sortOrder?: number; isActive?: boolean },
    @Req() req: RequestWithUser,
  ) {
    if (req.user?.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Only platform admin allowed');
    }
    const category = await this.prisma.productCategory.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl?.trim() ?? null }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });
    return category;
  }

  @Delete('products/:id')
  async deleteProduct(@Param('id') id: string, @Req() req: RequestWithUser) {
    if (req.user?.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Only platform admin allowed');
    }
    await this.prisma.product.delete({
      where: { id },
    });
    return { ok: true };
  }

  @Delete('product-categories/:id')
  async deleteProductCategory(@Param('id') id: string, @Req() req: RequestWithUser) {
    if (req.user?.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Only platform admin allowed');
    }
    await this.prisma.product.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    });
    await this.prisma.productCategory.delete({
      where: { id },
    });
    return { ok: true };
  }

  @Get('banners')
  async getBanners(@Req() req: RequestWithUser) {
    if (req.user?.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Only platform admin allowed');
    }
    return this.prisma.banner.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  @Post('banners')
  async createBanner(
    @Body()
    body: {
      title: string;
      text?: string;
      imageUrl?: string;
      ctaLabel?: string;
      ctaHref?: string;
      sortOrder?: number;
      isActive?: boolean;
    },
    @Req() req: RequestWithUser,
  ) {
    if (req.user?.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Only platform admin allowed');
    }
    if (!body.title || typeof body.title !== 'string') {
      throw new BadRequestException('title is required');
    }
    const banner = await this.prisma.banner.create({
      data: {
        title: body.title.trim(),
        text: body.text?.trim() ?? null,
        imageUrl: body.imageUrl?.trim() ?? null,
        ctaLabel: body.ctaLabel?.trim() ?? null,
        ctaHref: body.ctaHref?.trim() ?? null,
        sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : 0,
        isActive: body.isActive ?? true,
      },
    });
    return banner;
  }

  @Patch('banners/:id')
  async updateBanner(
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      text?: string;
      imageUrl?: string;
      ctaLabel?: string;
      ctaHref?: string;
      sortOrder?: number;
      isActive?: boolean;
    },
    @Req() req: RequestWithUser,
  ) {
    if (req.user?.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Only platform admin allowed');
    }
    const banner = await this.prisma.banner.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title.trim() }),
        ...(body.text !== undefined && { text: body.text?.trim() ?? null }),
        ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl?.trim() ?? null }),
        ...(body.ctaLabel !== undefined && { ctaLabel: body.ctaLabel?.trim() ?? null }),
        ...(body.ctaHref !== undefined && { ctaHref: body.ctaHref?.trim() ?? null }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });
    return banner;
  }

  @Delete('banners/:id')
  async deleteBanner(@Param('id') id: string, @Req() req: RequestWithUser) {
    if (req.user?.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Only platform admin allowed');
    }
    await this.prisma.banner.delete({
      where: { id },
    });
    return { ok: true };
  }
}
