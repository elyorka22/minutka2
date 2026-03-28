import {
  Body,
  Controller,
  Get,
  Patch,
  Param,
  Post,
  Delete,
  Query,
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
import { VisitsService } from './visits.service';
import { CacheService } from './cache.service';
import { StorageService } from './storage/storage.service';
import { UserRole } from '../generated/prisma/enums';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const webpush = require('web-push');

interface RequestWithUser {
  user?: { id: string; role: string };
}

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly visitsService: VisitsService,
    private readonly cache: CacheService,
    private readonly storage: StorageService,
  ) {
    const publicKey = process.env.PUBLIC_VAPID_KEY;
    const privateKey = process.env.PRIVATE_VAPID_KEY;
    if (publicKey && privateKey) {
      webpush.setVapidDetails('mailto:admin@minut-ka.uz', publicKey, privateKey);
    }
  }

  private assertPlatformAdmin(req: RequestWithUser) {
    if (req.user?.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Only platform admin allowed');
    }
  }

  private parsePagination(limitRaw?: string, offsetRaw?: string) {
    const limit = Math.min(Math.max(Number(limitRaw ?? 20) || 20, 1), 100);
    const offset = Math.max(Number(offsetRaw ?? 0) || 0, 0);
    return { limit, offset };
  }

  private invalidateCatalogCache() {
    this.cache.invalidatePrefix('restaurants:');
    this.cache.invalidatePrefix('menu:');
    this.cache.invalidatePrefix('home:');
    this.cache.invalidatePrefix('homepage:');
  }

  private invalidateHomeCache() {
    this.cache.invalidatePrefix('home:');
    this.cache.invalidatePrefix('restaurants:featured');
    this.cache.invalidatePrefix('homepage:');
  }

  private invalidateAdminStatsCache() {
    this.cache.invalidatePrefix('admin:stats:');
  }

  @Get('my-restaurants')
  async myRestaurants(@Req() req: RequestWithUser) {
    const userId = req.user?.id;
    if (!userId) {
      throw new ForbiddenException('Unauthorized');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        restaurants: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            description: true,
            address: true,
            logoUrl: true,
            coverUrl: true,
            isSupermarket: true,
            isActive: true,
          },
        },
      },
    });
    if (!user) throw new ForbiddenException('User not found');
    return user.restaurants ?? [];
  }

  @Get('overview')
  async overview(@Req() req: RequestWithUser) {
    this.assertPlatformAdmin(req);

    try {
      const [stats, restaurants, users, recentOrders, banners, productCategories] = await Promise.all([
        this.getOverviewStats(req),
        this.getOverviewRestaurants(req, '20', '0'),
        this.getOverviewUsers(req, '20', '0'),
        this.getOverviewRecentOrders(req, '20', '0'),
        this.prisma.banner.findMany({
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            title: true,
            text: true,
            imageUrl: true,
            ctaLabel: true,
            ctaHref: true,
            sortOrder: true,
            isActive: true,
          },
        }),
        this.prisma.productCategory.findMany({
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
          select: { id: true, name: true, imageUrl: true, sortOrder: true, isActive: true },
        }),
      ]);

      return {
        stats,
        restaurants,
        users,
        recentOrders,
        banners,
        productCategories,
      };
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      if (msg.includes('column') && msg.includes('does not exist')) {
        throw new BadRequestException(
          'Baza sxemasi yangilanmagan. Backend papkasida: npx prisma db push',
        );
      }
      throw e;
    }
  }

  @Get('overview/stats')
  async getOverviewStats(@Req() req: RequestWithUser) {
    this.assertPlatformAdmin(req);
    const [restaurants, users, totalOrders, delivered, cancelled, admins] = await Promise.all([
      this.prisma.restaurant.count({ where: { isActive: true } }),
      this.prisma.user.count(),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: 'DONE' } }),
      this.prisma.order.count({ where: { status: 'CANCELLED' } }),
      this.prisma.user.count({
        where: { role: { in: [UserRole.PLATFORM_ADMIN, UserRole.RESTAURANT_ADMIN, UserRole.COURIER] } },
      }),
    ]);
    return { restaurants, users, totalOrders, delivered, cancelled, admins };
  }

  @Get('overview/restaurants')
  async getOverviewRestaurants(
    @Req() req: RequestWithUser,
    @Query('limit') limitRaw?: string,
    @Query('offset') offsetRaw?: string,
  ) {
    this.assertPlatformAdmin(req);
    const { limit, offset } = this.parsePagination(limitRaw, offsetRaw);
    return this.prisma.restaurant.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        name: true,
        description: true,
        logoUrl: true,
        isFeatured: true,
        isSupermarket: true,
        platformFeePercent: true,
        createdAt: true,
      },
    });
  }

  @Get('overview/users')
  async getOverviewUsers(
    @Req() req: RequestWithUser,
    @Query('limit') limitRaw?: string,
    @Query('offset') offsetRaw?: string,
  ) {
    this.assertPlatformAdmin(req);
    const { limit, offset } = this.parsePagination(limitRaw, offsetRaw);
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
  }

  @Get('overview/recent-orders')
  async getOverviewRecentOrders(
    @Req() req: RequestWithUser,
    @Query('limit') limitRaw?: string,
    @Query('offset') offsetRaw?: string,
  ) {
    this.assertPlatformAdmin(req);
    const { limit, offset } = this.parsePagination(limitRaw, offsetRaw);
    return this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        status: true,
        total: true,
        createdAt: true,
        restaurant: { select: { id: true, name: true } },
        customer: { select: { id: true, email: true, name: true } },
      },
    });
  }

  @Get('users/push-subscribers')
  async getUsersWithPushSubscriptions(@Req() req: RequestWithUser) {
    if (req.user?.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Only platform admin allowed');
    }

    const users = await this.prisma.user.findMany({
      where: {
        role: UserRole.CUSTOMER,
        pushSubscriptions: { some: {} },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        _count: {
          select: {
            pushSubscriptions: true,
            orders: true,
          },
        },
      },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      createdAt: u.createdAt,
      pushSubscriptionsCount: u._count.pushSubscriptions,
      ordersCount: u._count.orders,
    }));
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

    if (role === UserRole.COURIER) {
      await this.prisma.courier.upsert({
        where: { userId: id },
        create: { userId: id },
        update: {},
      });
    } else {
      const courier = await this.prisma.courier.findUnique({ where: { userId: id } });
      if (courier) {
        await this.prisma.order.updateMany({ where: { courierId: courier.id }, data: { courierId: null } });
        await this.prisma.courier.delete({ where: { userId: id } }).catch(() => {});
      }
    }

    return user;
  }

  @Post('push/send')
  async sendPush(
    @Body() body: { title?: string; message?: string; url?: string },
    @Req() req: RequestWithUser,
  ) {
    if (req.user?.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Only platform admin allowed');
    }
    const title = (body.title ?? '').trim();
    const message = (body.message ?? '').trim();
    const url = (body.url ?? '/').trim() || '/';
    if (!title || !message) {
      throw new BadRequestException('title and message are required');
    }
    const subs = await this.prisma.pushSubscription.findMany({
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });
    let success = 0;
    let failed = 0;
    const chunkSize = 100;
    for (let i = 0; i < subs.length; i += chunkSize) {
      const chunk = subs.slice(i, i + chunkSize);
      const settled = await Promise.allSettled(
        chunk.map((s) =>
          webpush.sendNotification(
            {
              endpoint: s.endpoint,
              keys: { p256dh: s.p256dh, auth: s.auth },
            } as any,
            JSON.stringify({
              title,
              body: message,
              url,
            }),
          ),
        ),
      );
      for (let j = 0; j < settled.length; j++) {
        const r = settled[j];
        if (r.status === 'fulfilled') {
          success += 1;
          continue;
        }
        failed += 1;
        const err: any = r.reason;
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          await this.prisma.pushSubscription
            .delete({ where: { id: chunk[j].id } })
            .catch(() => {});
        }
      }
    }
    return { ok: true, success, failed };
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string, @Req() req: RequestWithUser) {
    if (req.user?.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Only platform admin allowed');
    }
    if (req.user?.id === id) {
      throw new BadRequestException('O‘zingizni o‘chirib bo‘lmaydi');
    }
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new BadRequestException('Foydalanuvchi topilmadi');

    const orderIds = (
      await this.prisma.order.findMany({ where: { customerId: id }, select: { id: true } })
    ).map((o) => o.id);
    if (orderIds.length) {
      const dt = this.prisma.deliveryTracking;
      await Promise.all([
        dt ? dt.deleteMany({ where: { orderId: { in: orderIds } } }).catch(() => {}) : Promise.resolve(),
        this.prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } }).catch(() => {}),
        this.prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } }),
      ]);
    }
    await Promise.all([
      this.prisma.order.deleteMany({ where: { customerId: id } }),
      this.prisma.address.deleteMany({ where: { userId: id } }),
    ]);
    const restaurantsWithAdmin = await this.prisma.restaurant.findMany({
      where: { admins: { some: { id } } },
      select: { id: true },
    });
    for (const r of restaurantsWithAdmin) {
      await this.prisma.restaurant.update({
        where: { id: r.id },
        data: { admins: { disconnect: { id } } },
      });
    }
    const courier = await this.prisma.courier.findUnique({ where: { userId: id } }).catch(() => null);
    if (courier) await this.prisma.courier.delete({ where: { id: courier.id } });
    await this.prisma.user.delete({ where: { id } });
    return { ok: true };
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

    if (this.storage.isEnabled()) {
      const publicUrl = await this.storage.uploadPublicImage({
        buffer: file.buffer,
        filename,
        contentType: file.mimetype,
      });
      if (publicUrl) {
        this.invalidateHomeCache();
        return { url: publicUrl };
      }
    }

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
    this.invalidateHomeCache();
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
    const existingUser = await this.usersService.findByEmailIgnoreCase(adminEmail);
    if (existingUser) {
      adminId = existingUser.id;
      const updatePayload: { role: UserRole; name: string; password?: string } = { role: UserRole.RESTAURANT_ADMIN, name: adminName };
      if (adminPassword.length >= 6) {
        const bcrypt = await import('bcrypt');
        updatePayload.password = await bcrypt.hash(adminPassword, 10);
      }
      await this.prisma.user.update({
        where: { id: adminId },
        data: updatePayload,
      });
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
        admins: { connect: { id: adminId } },
      },
    });
    this.invalidateCatalogCache();
    this.invalidateAdminStatsCache();
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
    this.invalidateCatalogCache();
    this.invalidateAdminStatsCache();
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
      this.invalidateCatalogCache();
      this.invalidateAdminStatsCache();
      return restaurant;
    } catch (e: any) {
      // Если есть связанные данные и срабатывает ограничение внешнего ключа,
      // просто помечаем ресторан как неактивный, чтобы скрыть его отовсюду.
      // Prisma может возвращать разные коды в зависимости от типа ограничения.
      if (e && (e.code === 'P2003' || e.code === 'P2014')) {
        const restaurant = await this.prisma.restaurant.update({
          where: { id },
          data: { isActive: false },
        });
        this.invalidateCatalogCache();
        this.invalidateAdminStatsCache();
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
      select: {
        id: true,
        name: true,
        address: true,
        description: true,
        logoUrl: true,
        coverUrl: true,
        categories: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            name: true,
            sortOrder: true,
            dishes: {
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
                imageUrl: true,
                categoryId: true,
                isAvailable: true,
              },
            },
          },
        },
        dishes: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            imageUrl: true,
            categoryId: true,
            isAvailable: true,
          },
        },
      },
    });
    if (!restaurant) throw new BadRequestException('Restaurant not found');
    return restaurant;
  }

  @Post('restaurants/:id/admins')
  async addRestaurantAdmin(
    @Param('id') id: string,
    @Body() body: { email: string },
    @Req() req: RequestWithUser,
  ) {
    if (req.user?.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Only platform admin allowed');
    }
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    if (!email) throw new BadRequestException('email is required');
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id } });
    if (!restaurant) throw new BadRequestException('Restaurant not found');
    let user = await this.usersService.findByEmail(email);
    if (!user) throw new BadRequestException('User with this email not found. Ask them to register first.');
    await this.prisma.user.update({
      where: { id: user.id },
      data: { role: UserRole.RESTAURANT_ADMIN },
    });
    await this.prisma.restaurant.update({
      where: { id },
      data: { admins: { connect: { id: user.id } } },
    });
    return { ok: true, message: 'Admin assigned' };
  }

  @Post('restaurants/:id/clear-platform-fee')
  async clearRestaurantPlatformFee(@Param('id') id: string, @Req() req: RequestWithUser) {
    if (req.user?.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Only platform admin allowed');
    }
    await this.prisma.restaurant.update({
      where: { id },
      data: { platformFeeClearedAt: new Date() },
    });
    this.invalidateAdminStatsCache();
    return { ok: true };
  }

  @Get('stats/visits')
  async getVisitStats(@Req() req: RequestWithUser) {
    if (req.user?.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Only platform admin allowed');
    }
    return this.cache.getOrSet('admin:stats:visits:7d', 30_000, () => this.visitsService.getStats(7));
  }

  @Get('stats/restaurants')
  async getRestaurantStats(@Req() req: RequestWithUser) {
    if (req.user?.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Only platform admin allowed');
    }
    return this.cache.getOrSet('admin:stats:restaurants:full', 45_000, async () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const [deliveredAgg, topDishRows, balancesRows, byDayRows, byHourRows] = await Promise.all([
        this.prisma.order.aggregate({
          where: { status: 'DONE', createdAt: { gte: sevenDaysAgo } },
          _count: { id: true },
          _sum: { total: true },
        }),
        this.prisma.$queryRaw<
          Array<{
            dishId: string;
            dishName: string;
            restaurantName: string;
            totalAmount: number;
            totalQuantity: number;
          }>
        >`
        SELECT
          d.id AS "dishId",
          d.name AS "dishName",
          r.name AS "restaurantName",
          COALESCE(SUM((oi.price::numeric) * oi.quantity), 0)::float AS "totalAmount",
          COALESCE(SUM(oi.quantity), 0)::int AS "totalQuantity"
        FROM "OrderItem" oi
        JOIN "Order" o ON o.id = oi."orderId"
        JOIN "Dish" d ON d.id = oi."dishId"
        JOIN "Restaurant" r ON r.id = d."restaurantId"
        WHERE o.status = 'DONE' AND o."createdAt" >= ${sevenDaysAgo}
        GROUP BY d.id, d.name, r.name
      `,
        this.prisma.$queryRaw<
          Array<{ restaurantId: string; restaurantName: string; amountOwed: number }>
        >`
        SELECT
          r.id AS "restaurantId",
          r.name AS "restaurantName",
          COALESCE(
            SUM(
              CASE
                WHEN o.id IS NULL THEN 0
                ELSE (o.total::numeric) * (r."platformFeePercent"::numeric) / 100
              END
            ),
            0
          )::float AS "amountOwed"
        FROM "Restaurant" r
        LEFT JOIN "Order" o
          ON o."restaurantId" = r.id
          AND o.status = 'DONE'
          AND (r."platformFeeClearedAt" IS NULL OR o."createdAt" > r."platformFeeClearedAt")
        WHERE r."isActive" = true
        GROUP BY r.id, r.name
      `,
        this.prisma.$queryRaw<Array<{ day: number; count: number }>>`
        SELECT
          EXTRACT(DOW FROM o."createdAt")::int AS day,
          COUNT(*)::int AS count
        FROM "Order" o
        WHERE o.status = 'DONE'
        GROUP BY EXTRACT(DOW FROM o."createdAt")
      `,
        this.prisma.$queryRaw<Array<{ hour: number; count: number }>>`
        SELECT
          EXTRACT(HOUR FROM o."createdAt")::int AS hour,
          COUNT(*)::int AS count
        FROM "Order" o
        WHERE o.status = 'DONE'
        GROUP BY EXTRACT(HOUR FROM o."createdAt")
      `,
      ]);

      const deliveredLast7Days = {
        count: deliveredAgg._count.id ?? 0,
        totalAmount: Number(deliveredAgg._sum.total ?? 0),
      };

      const topDishesByAmount = [...topDishRows]
        .sort((a, b) => Number(b.totalAmount) - Number(a.totalAmount))
        .slice(0, 15);
      const topDishesByQuantity = [...topDishRows]
        .sort((a, b) => Number(b.totalQuantity) - Number(a.totalQuantity))
        .slice(0, 15);

      const restaurantBalances = balancesRows.map((r) => ({
        restaurantId: r.restaurantId,
        restaurantName: r.restaurantName,
        amountOwed: Math.round(Number(r.amountOwed) * 100) / 100,
      }));

      const byDayMap = new Map(byDayRows.map((r) => [Number(r.day), Number(r.count)]));
      const ordersByDayOfWeek = [1, 2, 3, 4, 5, 6, 0].map((day) => ({
        day,
        count: byDayMap.get(day) ?? 0,
      }));

      const byHourMap = new Map(byHourRows.map((r) => [Number(r.hour), Number(r.count)]));
      const ordersByHour = Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        count: byHourMap.get(h) ?? 0,
      }));

      return {
        deliveredLast7Days,
        topDishesByAmount,
        topDishesByQuantity,
        restaurantBalances,
        ordersByDayOfWeek,
        ordersByHour,
      };
    });
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
    this.invalidateCatalogCache();
    this.invalidateAdminStatsCache();
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
    this.invalidateCatalogCache();
    this.invalidateAdminStatsCache();
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
    this.invalidateCatalogCache();
    this.invalidateAdminStatsCache();
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
    this.invalidateCatalogCache();
    this.invalidateAdminStatsCache();
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
    this.invalidateHomeCache();
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
    this.invalidateHomeCache();
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
    this.invalidateHomeCache();
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
    this.invalidateHomeCache();
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
    this.invalidateHomeCache();
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
    this.invalidateHomeCache();
    return { ok: true };
  }
}
