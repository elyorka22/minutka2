import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { PatchOrderStatusDto } from './dto/patch-order-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma.service';
import { OrdersQueue } from './orders.queue';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly authService: AuthService,
    private readonly ordersQueue: OrdersQueue,
  ) {}

  @Post()
  @UseGuards(ThrottlerGuard)
  @Throttle({
    default: {
      limit: Number(process.env.ORDERS_THROTTLE_LIMIT ?? 15),
      ttl: Number(process.env.ORDERS_THROTTLE_TTL_MS ?? 60000),
    },
  })
  async create(@Body() dto: CreateOrderDto, @Req() req: { headers?: { authorization?: string }; user?: { id: string } }) {
    const startedAt = Date.now();
    let ok = false;
    let customerId: string | null = null;
    const authHeader = req.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const payload = this.authService.verifyToken(authHeader.slice(7));
        customerId = payload.sub;
      } catch {
        // invalid token — create as guest
      }
    }
    try {
      const queueEnabled = process.env.ORDERS_QUEUE_ENABLED === 'true';
      if (queueEnabled) {
        const queued = await this.ordersQueue.enqueueCreateOrder({ customerId, dto });
        ok = true;
        return { status: 'queued', jobId: queued.jobId };
      } else {
        const result = await this.ordersService.create(customerId, dto);
        ok = true;
        return result;
      }
    } catch (e: any) {
      const message = e?.message ? String(e.message) : 'Order creation failed';
      throw new BadRequestException(message);
    } finally {
      const ms = Date.now() - startedAt;
      // eslint-disable-next-line no-console
      console.log(`[orders.create] ok=${ok} durationMs=${ms} restaurantId=${dto.restaurantId}`);
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findMyOrders(@Req() req: { user?: { id: string } }) {
    const userId = req.user?.id;
    if (!userId) throw new Error('Unauthorized');
    return this.ordersService.findForCustomer(userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string, @Req() req: { user?: { id: string } }) {
    const userId = req.user?.id;
    return this.ordersService.findOne(id, userId ?? undefined);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  updateStatus(
    @Param('id') id: string,
    @Body() body: PatchOrderStatusDto,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user?.id;
    const role = req.user?.role;
    if (!userId || !role) throw new BadRequestException('Unauthorized');
    return this.ordersService.updateStatus(id, body.status, role, userId, body.cancelReason);
  }

  @Post(':id/take')
  @UseGuards(JwtAuthGuard)
  async takeOrder(@Param('id') id: string, @Req() req: RequestWithUser) {
    if (req.user?.role !== 'COURIER') {
      throw new ForbiddenException('Faqat kuryerlar uchun');
    }
    const userId = req.user?.id;
    if (!userId) throw new BadRequestException('Unauthorized');
    return this.ordersService.takeOrder(id, userId);
  }
}

@Controller('courier')
export class CourierOrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('orders')
  @UseGuards(JwtAuthGuard)
  async list(
    @Req() req: RequestWithUser,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('scope') scope?: string,
  ) {
    if (req.user?.role !== 'COURIER') {
      throw new ForbiddenException('Faqat kuryerlar uchun');
    }
    const userId = req.user?.id;
    if (userId) {
      await this.prisma.courier.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });
    }
    const scopeNorm = scope === 'mine' ? 'mine' : 'pool';
    return this.ordersService.findForCourier(userId, {
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      scope: scopeNorm,
    });
  }

  @Get('orders/changes')
  @UseGuards(JwtAuthGuard)
  async changes(
    @Req() req: RequestWithUser,
    @Query('scope') scope?: string,
    @Query('since') since?: string,
  ) {
    if (req.user?.role !== 'COURIER') {
      throw new ForbiddenException('Faqat kuryerlar uchun');
    }
    const userId = req.user?.id;
    if (!userId) throw new BadRequestException('Unauthorized');
    const scopeNorm = scope === 'mine' ? 'mine' : 'pool';
    return this.ordersService.hasCourierOrdersChanges(userId, {
      scope: scopeNorm,
      sinceIso: since,
    });
  }

  @Get('stats/delivered-by-day')
  @UseGuards(JwtAuthGuard)
  async deliveredByDay(@Req() req: RequestWithUser, @Query('days') days?: string) {
    if (req.user?.role !== 'COURIER') {
      throw new ForbiddenException('Faqat kuryerlar uchun');
    }
    const userId = req.user?.id;
    if (!userId) throw new BadRequestException('Unauthorized');
    const n = days !== undefined && days !== '' ? Number(days) : undefined;
    return this.ordersService.getCourierDeliveredByDay(userId, Number.isFinite(n) ? n : undefined);
  }
}

interface RequestWithUser {
  user?: { id: string; role: string };
}

@Controller('restaurants/:restaurantId/orders')
export class RestaurantOrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly prisma: PrismaService,
  ) {}

  private async ensureRestaurantAdminAccess(restaurantId: string, userId: string, userRole: string): Promise<void> {
    if (userRole === 'PLATFORM_ADMIN') return;
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { id: restaurantId, isActive: true, admins: { some: { id: userId } } },
      select: { id: true },
    });
    if (!restaurant) {
      throw new ForbiddenException('Sizga tayinlangan restoran yoki do\'kon yo\'q.');
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findForRestaurant(
    @Param('restaurantId') restaurantId: string,
    @Req() req: RequestWithUser,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('status') status?: string,
  ) {
    const userId = req.user?.id;
    const role = req.user?.role;
    if (userId && role) await this.ensureRestaurantAdminAccess(restaurantId, userId, role);
    return this.ordersService.findForRestaurant(restaurantId, {
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      status,
    });
  }

  @Get('changes')
  @UseGuards(JwtAuthGuard)
  async hasChanges(
    @Param('restaurantId') restaurantId: string,
    @Req() req: RequestWithUser,
    @Query('status') status?: string,
    @Query('since') since?: string,
  ) {
    const userId = req.user?.id;
    const role = req.user?.role;
    if (userId && role) await this.ensureRestaurantAdminAccess(restaurantId, userId, role);
    return this.ordersService.hasRestaurantOrdersChanges(restaurantId, {
      status,
      sinceIso: since,
    });
  }

  @Get('archive')
  @UseGuards(JwtAuthGuard)
  async findArchive(
    @Param('restaurantId') restaurantId: string,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user?.id;
    const role = req.user?.role;
    if (userId && role) await this.ensureRestaurantAdminAccess(restaurantId, userId, role);
    return this.ordersService.findArchiveForRestaurant(restaurantId);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getStats(
    @Param('restaurantId') restaurantId: string,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user?.id;
    const role = req.user?.role;
    if (userId && role) await this.ensureRestaurantAdminAccess(restaurantId, userId, role);
    return this.ordersService.getRestaurantStats(restaurantId);
  }
}

@Controller('restaurants/:restaurantId')
export class RestaurantSettingsController {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureRestaurantAdminAccess(restaurantId: string, userId: string, userRole: string): Promise<void> {
    if (userRole === 'PLATFORM_ADMIN') return;
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { id: restaurantId, isActive: true, admins: { some: { id: userId } } },
      select: { id: true },
    });
    if (!restaurant) {
      throw new ForbiddenException('Sizga tayinlangan restoran yoki do\'kon yo\'q.');
    }
  }

  @Get('settings')
  @UseGuards(JwtAuthGuard)
  async getSettings(
    @Param('restaurantId') restaurantId: string,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user?.id;
    const role = req.user?.role;
    if (userId && role) await this.ensureRestaurantAdminAccess(restaurantId, userId, role);
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { telegramChatId: true },
    });
    return { telegramChatId: restaurant?.telegramChatId ?? '' };
  }

  @Patch('settings')
  @UseGuards(JwtAuthGuard)
  async patchSettings(
    @Param('restaurantId') restaurantId: string,
    @Body() body: { telegramChatId?: string },
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user?.id;
    const role = req.user?.role;
    if (userId && role) await this.ensureRestaurantAdminAccess(restaurantId, userId, role);
    const value = typeof body.telegramChatId === 'string' ? body.telegramChatId.trim() || null : null;
    await this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: { telegramChatId: value },
    });
    return { telegramChatId: value ?? '' };
  }
}
