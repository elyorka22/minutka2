import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpException,
  Logger,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Job, Queue } from 'bullmq';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { PatchOrderStatusDto } from './dto/patch-order-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma.service';
import { OrdersQueue } from './orders.queue';
import { CreateOrderJobData, ORDERS_QUEUE_NAME } from './orders.constants';
import { CacheService } from '../cache.service';

function isTruthyEnv(v: unknown): boolean {
  if (typeof v !== 'string') return false;
  const s = v.trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes' || s === 'y';
}

@Controller('orders')
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);
  constructor(
    private readonly ordersService: OrdersService,
    private readonly authService: AuthService,
    private readonly ordersQueue: OrdersQueue,
    @InjectQueue(ORDERS_QUEUE_NAME) private readonly ordersBullQueue: Queue,
  ) {}

  private assertCreateJobAccess(
    job: Job<CreateOrderJobData, unknown, string>,
    authHeader: string | undefined,
    clientKeyQ: string | undefined,
  ): void {
    const data = job.data;
    if (data.customerId) {
      if (!authHeader?.startsWith('Bearer ')) {
        throw new ForbiddenException();
      }
      try {
        const payload = this.authService.verifyToken(authHeader.slice('Bearer '.length));
        if (payload.sub !== data.customerId) {
          throw new ForbiddenException();
        }
      } catch (e) {
        if (e instanceof ForbiddenException) throw e;
        throw new ForbiddenException();
      }
      return;
    }
    const dk = data.dto?.clientKey;
    if (dk) {
      if (clientKeyQ !== dk) {
        throw new ForbiddenException();
      }
    }
  }

  @Post()
  @HttpCode(200)
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
      const queueEnabled = isTruthyEnv(process.env.ORDERS_QUEUE_ENABLED);
      if (!queueEnabled) {
        throw new ServiceUnavailableException('Orders queue is disabled');
      }
      this.logger.log(`[orders.create] QUEUE USED restaurantId=${dto.restaurantId}`);
      const queued = await this.ordersQueue.enqueueCreateOrder({ customerId, dto });
      this.logger.log(`[orders.create] queued jobId=${queued.jobId}`);
      ok = true;
      return { status: 'queued', jobId: queued.jobId };
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
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

  @Get('create-job/:jobId')
  @UseGuards(ThrottlerGuard)
  @Throttle({
    default: {
      limit: Number(process.env.ORDERS_JOB_POLL_THROTTLE_LIMIT ?? 120),
      ttl: Number(process.env.ORDERS_JOB_POLL_THROTTLE_TTL_MS ?? 60000),
    },
  })
  async getCreateJobStatus(
    @Param('jobId') jobId: string,
    @Query('clientKey') clientKey: string | undefined,
    @Req() req: { headers?: { authorization?: string } },
  ) {
    const job = await this.ordersBullQueue.getJob(jobId);
    if (!job) {
      throw new NotFoundException('Jarayon topilmadi');
    }
    this.assertCreateJobAccess(job as Job<CreateOrderJobData, unknown, string>, req.headers?.authorization, clientKey);
    const state = await job.getState();
    const rv = job.returnvalue as { orderId?: string } | null | undefined;
    const failedReason = job.failedReason ?? undefined;
    return {
      state,
      orderId: state === 'completed' && rv?.orderId ? rv.orderId : null,
      error: state === 'failed' ? failedReason ?? 'Xatolik' : null,
    };
  }

  @Get('track/:orderId/status')
  @UseGuards(ThrottlerGuard)
  @Throttle({
    default: {
      limit: Number(process.env.ORDERS_TRACK_THROTTLE_LIMIT ?? 120),
      ttl: Number(process.env.ORDERS_TRACK_THROTTLE_TTL_MS ?? 60000),
    },
  })
  async trackOrderStatus(
    @Param('orderId') orderId: string,
    @Query('clientKey') clientKey: string | undefined,
    @Req() req: { headers?: { authorization?: string } },
  ) {
    let userId: string | undefined;
    const auth = req.headers?.authorization;
    if (auth?.startsWith('Bearer ')) {
      try {
        const p = this.authService.verifyToken(auth.slice('Bearer '.length));
        userId = p.sub;
      } catch {
        userId = undefined;
      }
    }
    return this.ordersService.getOrderTrackStatus(orderId, userId, clientKey);
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

  @Post(':id/received')
  @UseGuards(JwtAuthGuard)
  async markReceived(@Param('id') id: string, @Req() req: RequestWithUser) {
    const userId = req.user?.id;
    if (!userId) throw new BadRequestException('Unauthorized');
    return this.ordersService.markReceivedByCustomer(id, userId);
  }
}

@Controller('courier')
export class CourierOrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('settings')
  @UseGuards(JwtAuthGuard)
  async getSettings(@Req() req: RequestWithUser) {
    if (req.user?.role !== 'COURIER') {
      throw new ForbiddenException('Faqat kuryerlar uchun');
    }
    const userId = req.user?.id;
    if (!userId) throw new BadRequestException('Unauthorized');
    const row = await this.prisma.courier.findUnique({
      where: { userId },
      select: { telegramChatId: true },
    });
    return { telegramChatId: row?.telegramChatId ?? '' };
  }

  @Patch('settings')
  @UseGuards(JwtAuthGuard)
  async patchSettings(
    @Body() body: { telegramChatId?: string },
    @Req() req: RequestWithUser,
  ) {
    if (req.user?.role !== 'COURIER') {
      throw new ForbiddenException('Faqat kuryerlar uchun');
    }
    const userId = req.user?.id;
    if (!userId) throw new BadRequestException('Unauthorized');
    const value = typeof body.telegramChatId === 'string' ? body.telegramChatId.trim() || null : null;
    await this.prisma.courier.upsert({
      where: { userId },
      create: { userId, telegramChatId: value },
      update: { telegramChatId: value },
    });
    return { telegramChatId: value ?? '' };
  }

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

@Controller('restaurants/:restaurantId/menu')
export class RestaurantMenuAdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  private async ensureRestaurantAdminAccess(
    restaurantId: string,
    userId: string,
    userRole: string,
  ): Promise<void> {
    if (userRole === 'PLATFORM_ADMIN') return;
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { id: restaurantId, isActive: true, admins: { some: { id: userId } } },
      select: { id: true },
    });
    if (!restaurant) {
      throw new ForbiddenException('Sizga tayinlangan restoran yoki do\'kon yo\'q.');
    }
  }

  @Get('dishes')
  @UseGuards(JwtAuthGuard)
  async getDishes(
    @Param('restaurantId') restaurantId: string,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user?.id;
    const role = req.user?.role;
    if (userId && role) await this.ensureRestaurantAdminAccess(restaurantId, userId, role);
    return this.prisma.dish.findMany({
      where: { restaurantId },
      orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        isAvailable: true,
        imageUrl: true,
        category: {
          select: { id: true, name: true, sortOrder: true },
        },
      },
    });
  }

  @Patch('dishes/:dishId')
  @UseGuards(JwtAuthGuard)
  async updateDish(
    @Param('restaurantId') restaurantId: string,
    @Param('dishId') dishId: string,
    @Body() body: { price?: number; isAvailable?: boolean },
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user?.id;
    const role = req.user?.role;
    if (userId && role) await this.ensureRestaurantAdminAccess(restaurantId, userId, role);

    const exists = await this.prisma.dish.findFirst({
      where: { id: dishId, restaurantId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Taom topilmadi');

    const data: { price?: number; isAvailable?: boolean } = {};
    if (body.price !== undefined) {
      const p = Number(body.price);
      if (!Number.isFinite(p) || p < 0) {
        throw new BadRequestException('Narx noto‘g‘ri');
      }
      data.price = p;
    }
    if (body.isAvailable !== undefined) {
      data.isAvailable = !!body.isAvailable;
    }
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Hech qanday yangilanish maydoni berilmadi');
    }

    const updated = await this.prisma.dish.update({
      where: { id: dishId },
      data,
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        isAvailable: true,
        imageUrl: true,
        category: {
          select: { id: true, name: true, sortOrder: true },
        },
      },
    });

    this.cache.invalidatePrefix('menu:');
    this.cache.invalidatePrefix('restaurants:one:');
    return updated;
  }
}
