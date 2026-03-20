import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UsersService } from '../users/users.service';
import { CreateOrderDto } from './dto/create-order.dto';

type OrderStatus =
  | 'NEW'
  | 'ACCEPTED'
  | 'READY'
  | 'ON_THE_WAY'
  | 'DONE'
  | 'CANCELLED';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async create(customerId: string | null, dto: CreateOrderDto) {
    const userId = customerId ?? (await this.usersService.findOrCreateGuestUser());
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: dto.restaurantId, isActive: true },
    });
    if (!restaurant) throw new Error('Restaurant not found');

    const deliveryFee = Number(restaurant.deliveryFee);
    const serviceFeeRate = 0.1;
    let subtotal = 0;

    const dishPrices: { dishId: string; price: number }[] = [];
    for (const item of dto.items) {
      const dish = await this.prisma.dish.findFirst({
        where: { id: item.dishId, restaurantId: dto.restaurantId, isAvailable: true },
      });
      if (!dish) throw new Error(`Dish ${item.dishId} not found`);
      const price = Number(dish.price);
      subtotal += price * item.quantity;
      dishPrices.push({ dishId: item.dishId, price });
    }

    const serviceFee = Math.round(subtotal * serviceFeeRate * 100) / 100;
    const total = Math.round((subtotal + deliveryFee + serviceFee) * 100) / 100;

    const address = await this.prisma.address.create({
      data: {
        userId,
        label: dto.address.label,
        street: dto.address.street,
        city: dto.address.city,
        details: dto.address.details,
        latitude: dto.address.latitude,
        longitude: dto.address.longitude,
      },
    });

    const order = await this.prisma.order.create({
      data: {
        customerId: userId,
        restaurantId: dto.restaurantId,
        addressId: address.id,
        comment: dto.comment,
        subtotal,
        deliveryFee,
        serviceFee,
        total,
        items: {
          create: dto.items.map((item) => {
            const p = dishPrices.find((x) => x.dishId === item.dishId);
            return {
              dishId: item.dishId,
              quantity: item.quantity,
              price: p?.price ?? 0,
            };
          }),
        },
      },
      include: {
        items: { include: { dish: true } },
        address: true,
        restaurant: true,
        customer: { select: { name: true } },
      },
    });

    const notifyUrl = process.env.TELEGRAM_BOT_NOTIFY_URL;
    const chatId = (order.restaurant as any).telegramChatId;
    if (notifyUrl && chatId) {
      const base = notifyUrl.replace(/\/$/, '');
      const phone = order.address?.details?.replace(/^Tel:\s*/i, '') ?? '';
      const payload = {
        chatId,
        order: {
          id: order.id,
          restaurantName: order.restaurant.name,
          total: Number(order.total),
          customerName: (order as any).customer?.name ?? '',
          phone,
          lat: order.address?.latitude,
          lng: order.address?.longitude,
        },
      };
      fetch(`${base}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    }

    if (dto.paymentMethod === 'CARD') {
      await this.prisma.payment.create({
        data: {
          orderId: order.id,
          provider: 'demo',
          amount: order.total,
          method: 'CARD',
          status: 'SUCCEEDED',
        },
      });
    }

    return order;
  }

  async findForCustomer(customerId: string) {
    return this.prisma.order.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { dish: true } },
        restaurant: true,
        address: true,
      },
    });
  }

  async findOne(id: string, customerId?: string) {
    const where: { id: string; customerId?: string } = { id };
    if (customerId) where.customerId = customerId;
    return this.prisma.order.findFirst({
      where,
      include: {
        items: { include: { dish: true } },
        restaurant: true,
        address: true,
      },
    });
  }

  private getAllowedTransitions() {
    const transitions: Record<
      Exclude<
        OrderStatus,
        'CANCELLED'
      >,
      Exclude<OrderStatus, 'CANCELLED'>[]
    > = {
      NEW: ['ACCEPTED'],
      ACCEPTED: ['READY'],
      READY: ['ON_THE_WAY'],
      ON_THE_WAY: ['DONE'],
      // DONE transitions are only via CANCELLED (handled separately)
    } as any;
    return transitions;
  }

  private isValidTransition(oldStatus: OrderStatus, newStatus: OrderStatus): boolean {
    if (oldStatus === newStatus) return false;
    if (newStatus === 'CANCELLED') return true; // any -> CANCELLED
    const allowed = this.getAllowedTransitions();
    return (allowed as any)[oldStatus]?.includes(newStatus);
  }

  async takeOrder(orderId: string, courierUserId: string) {
    const courier = await this.prisma.courier.upsert({
      where: { userId: courierUserId },
      create: { userId: courierUserId },
      update: {},
    });

    // Atomic update prevents 2 couriers from taking the same order.
    const updated = await this.prisma.order.updateMany({
      where: {
        id: orderId,
        status: 'READY',
        courierId: null,
      },
      data: { courierId: courier.id },
    });

    if (updated.count === 0) {
      throw new BadRequestException('Order not found, already taken, or not READY');
    }

    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { dish: true } },
        address: true,
        restaurant: true,
        courier: true,
        customer: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
  }

  async updateStatus(
    id: string,
    status: OrderStatus,
    actorRole: string,
    actorUserId: string,
    cancelReason?: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      select: { id: true, status: true, restaurantId: true, courierId: true },
    });

    if (!order) throw new BadRequestException('Order not found');
    if (!this.isValidTransition(order.status, status)) throw new BadRequestException('Invalid status transition');

    const isCourier = actorRole === 'COURIER';
    const isAdmin = actorRole === 'PLATFORM_ADMIN' || actorRole === 'RESTAURANT_ADMIN';

    if (!isCourier && !isAdmin) throw new ForbiddenException('Forbidden');

    if (isCourier && status === 'CANCELLED') {
      throw new BadRequestException('Couriers can not cancel orders');
    }

    // Authorization + actor constraints
    if (isCourier) {
      const courier = await this.prisma.courier.upsert({
        where: { userId: actorUserId },
        create: { userId: actorUserId },
        update: {},
      });

      if (order.courierId !== courier.id) throw new ForbiddenException('This order is not yours');

      // Courier allowed transitions:
      if (order.status === 'READY' && status !== 'ON_THE_WAY') throw new BadRequestException('Invalid transition for courier');
      if (order.status === 'ON_THE_WAY' && status !== 'DONE') throw new BadRequestException('Invalid transition for courier');
      if (order.status === 'DONE') throw new BadRequestException('Invalid transition for courier');
    } else if (isAdmin && actorRole === 'RESTAURANT_ADMIN') {
      // Restaurant admin can only operate on their own restaurant orders.
      const restaurant = await this.prisma.restaurant.findFirst({
        where: { id: order.restaurantId, isActive: true, admins: { some: { id: actorUserId } } },
        select: { id: true },
      });
      if (!restaurant) throw new ForbiddenException("Sizga tayinlangan restoran yoki do'kon yo'q.");
    }

    const changedBy: 'ADMIN' | 'COURIER' = isCourier ? 'COURIER' : 'ADMIN';

    const oldStatus = order.status;
    if (status === 'CANCELLED') {
      if (!cancelReason || !cancelReason.trim()) {
        throw new BadRequestException('cancelReason is required');
      }
    }

    const updatedOrder = await this.prisma.transaction(async (tx) => {
      const result = await tx.order.update({
        where: { id },
        data:
          status === 'CANCELLED'
            ? {
                status,
                cancelReason: cancelReason ?? null,
                cancelledBy: changedBy,
                cancelledAt: new Date(),
              }
            : {
                status,
              },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          oldStatus,
          newStatus: status,
          changedBy,
        },
      });

      return result;
    });

    return this.prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { dish: true } },
        restaurant: true,
        address: true,
        customer: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
  }

  async findForRestaurant(restaurantId: string) {
    return this.prisma.order.findMany({
      where: {
        restaurantId,
        status: { notIn: ['DONE', 'CANCELLED'] },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { dish: true } },
        address: true,
        customer: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
  }

  /** Barcha faol restoranlar buyurtmalari — kuryerlar ro‘yxati uchun */
  async findForCourier(courierUserId: string) {
    const courier = await this.prisma.courier.upsert({
      where: { userId: courierUserId },
      create: { userId: courierUserId },
      update: {},
    });

    return this.prisma.order.findMany({
      where: {
        restaurant: { isActive: true },
        OR: [
          { status: 'READY', courierId: null },
          { courierId: courier.id },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
      include: {
        items: { include: { dish: true } },
        address: true,
        restaurant: true,
        courier: true,
        customer: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
  }

  async deleteOrdersOlderThanDays(days: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const old = await this.prisma.order.findMany({
      where: { createdAt: { lt: cutoff } },
      select: { id: true },
    });
    for (const o of old) {
      if (this.prisma.deliveryTracking) {
        await this.prisma.deliveryTracking.deleteMany({ where: { orderId: o.id } }).catch(() => {});
      }
      await this.prisma.orderItem.deleteMany({ where: { orderId: o.id } });
      await this.prisma.payment.deleteMany({ where: { orderId: o.id } }).catch(() => {});
      await this.prisma.order.delete({ where: { id: o.id } }).catch(() => {});
    }
    return old.length;
  }

  async findArchiveForRestaurant(restaurantId: string) {
    await this.deleteOrdersOlderThanDays(3);
    const since = new Date();
    since.setDate(since.getDate() - 3);
    return this.prisma.order.findMany({
      where: {
        restaurantId,
        status: { in: ['DONE', 'CANCELLED'] },
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { dish: true } },
        address: true,
        customer: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
  }

  async getRestaurantStats(restaurantId: string) {
    const [restaurant, orders, activeCount] = await Promise.all([
      this.prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: { platformFeePercent: true },
      }),
      this.prisma.order.findMany({
        where: { restaurantId, status: 'DONE' },
        select: { total: true, subtotal: true },
      }),
      this.prisma.order.count({
        where: {
          restaurantId,
          status: { notIn: ['DONE', 'CANCELLED'] },
        },
      }),
    ]);
    const percent = restaurant?.platformFeePercent != null ? Number(restaurant.platformFeePercent) : 10;
    let totalRevenue = 0;
    let totalPlatformFee = 0;
    for (const o of orders) {
      const t = Number(o.total);
      totalRevenue += t;
      totalPlatformFee += (t * percent) / 100;
    }
    return {
      activeOrdersCount: activeCount,
      deliveredOrdersCount: orders.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      platformFeePercent: percent,
      totalPlatformFee: Math.round(totalPlatformFee * 100) / 100,
    };
  }
}
