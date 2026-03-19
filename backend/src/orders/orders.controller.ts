import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma.service';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly authService: AuthService,
  ) {}

  @Post()
  async create(@Body() dto: CreateOrderDto, @Req() req: { headers?: { authorization?: string }; user?: { id: string } }) {
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
    return this.ordersService.create(customerId, dto);
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
    @Body('status') status: 'NEW' | 'ACCEPTED' | 'COOKING' | 'DELIVERING' | 'DELIVERED' | 'CANCELLED',
  ) {
    return this.ordersService.updateStatus(id, status);
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
  async list(@Req() req: RequestWithUser) {
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
    return this.ordersService.findAllForCouriers();
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
  ) {
    const userId = req.user?.id;
    const role = req.user?.role;
    if (userId && role) await this.ensureRestaurantAdminAccess(restaurantId, userId, role);
    return this.ordersService.findForRestaurant(restaurantId);
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
