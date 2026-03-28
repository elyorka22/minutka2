import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UsersService } from '../users/users.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { fetchWithRetry } from '../common/http/fetch-with-retry';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const webpush = require('web-push');

type OrderStatus =
  | 'NEW'
  | 'ACCEPTED'
  | 'READY'
  | 'ON_THE_WAY'
  | 'DONE'
  | 'CANCELLED';

@Injectable()
export class OrdersService {
  private lastArchiveCleanupAtMs = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {
    const publicKey = process.env.PUBLIC_VAPID_KEY;
    const privateKey = process.env.PRIVATE_VAPID_KEY;
    if (publicKey && privateKey) {
      webpush.setVapidDetails('mailto:admin@minut-ka.uz', publicKey, privateKey);
    } else {
      // Helps debug "no push" issues in production logs.
      // eslint-disable-next-line no-console
      console.warn('[push] VAPID keys are missing in env (PUBLIC_VAPID_KEY/PRIVATE_VAPID_KEY)');
    }
  }

  async create(customerId: string | null, dto: CreateOrderDto) {
    let userId =
      customerId ?? (await this.usersService.findOrCreateGuestUser(dto.clientKey));

    // If JWT points to a user that was deleted after token issuance,
    // we must not create Address with an invalid FK.
    const userExists = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!userExists) {
      userId = await this.usersService.findOrCreateGuestUser(dto.clientKey);
    }
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: dto.restaurantId, isActive: true },
      select: {
        id: true,
        name: true,
        deliveryFee: true,
        telegramChatId: true,
      },
    });
    if (!restaurant) throw new Error('Restaurant not found');

    const deliveryFee = Number(restaurant.deliveryFee);
    const serviceFeeRate = 0.1;
    let subtotal = 0;

    const requestedDishIds = Array.from(new Set(dto.items.map((i) => i.dishId)));
    const dishes = await this.prisma.dish.findMany({
      where: { id: { in: requestedDishIds }, restaurantId: dto.restaurantId, isAvailable: true },
      select: { id: true, price: true },
    });
    const dishById = new Map(dishes.map((d) => [d.id, Number(d.price)]));
    for (const item of dto.items) {
      const price = dishById.get(item.dishId);
      if (price == null) throw new Error(`Dish ${item.dishId} not found`);
      subtotal += price * item.quantity;
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
            const p = dishById.get(item.dishId);
            return {
              dishId: item.dishId,
              quantity: item.quantity,
              price: p ?? 0,
            };
          }),
        },
      },
      select: {
        id: true,
        total: true,
        createdAt: true,
        items: {
          select: {
            dishId: true,
            quantity: true,
            price: true,
            dish: { select: { id: true, name: true, imageUrl: true } },
          },
        },
        address: {
          select: {
            id: true,
            label: true,
            street: true,
            city: true,
            details: true,
            latitude: true,
            longitude: true,
          },
        },
        restaurant: { select: { id: true, name: true } },
        customer: { select: { name: true } },
      },
    });

    const notifyUrl = process.env.TELEGRAM_BOT_NOTIFY_URL;
      const chatId = (restaurant as any).telegramChatId;
    if (notifyUrl && chatId) {
      const base = notifyUrl.replace(/\/$/, '');
      const phone = order.address?.details?.replace(/^Tel:\s*/i, '') ?? '';
      const payload = {
        chatId,
        order: {
          id: order.id,
          restaurantName: restaurant.name,
          total: Number(order.total),
          customerName: (order as any).customer?.name ?? '',
          phone,
          lat: order.address?.latitude,
          lng: order.address?.longitude,
        },
      };
      fetchWithRetry(`${base}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    }

    // Web-push to restaurant admins about a new order.
    // Never block order creation; but do not swallow errors silently.
    try {
      const restaurantWithAdmins = await this.prisma.restaurant.findUnique({
        where: { id: dto.restaurantId },
        select: { admins: { select: { id: true, role: true } } },
      });
      const adminUserIds =
        restaurantWithAdmins?.admins?.map((u) => u.id).filter(Boolean) ?? [];

      void this.sendPushToUserIds(adminUserIds, {
        title: 'Minutka',
        message: `Yangi buyurtma #${order.id.slice(0, 8)}`,
        url: `/restaurant-admin/${dto.restaurantId}`,
      }).catch((e) => {
        // eslint-disable-next-line no-console
        console.error('[push] restaurant-admins NEW order failed', {
          restaurantId: dto.restaurantId,
          error: e?.message ?? String(e),
        });
      });
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error('[push] restaurant-admins NEW order failed', {
        restaurantId: dto.restaurantId,
        error: e?.message ?? String(e),
      });
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

  private mapStatusFilter(status?: string): OrderStatus | null {
    if (!status) return null;
    const s = status.toUpperCase();
    if (s === 'IN_PATH') return 'ON_THE_WAY';
    if (s === 'ON_THE_WAY') return 'ON_THE_WAY';
    if (s === 'READY') return 'READY';
    if (s === 'NEW') return 'NEW';
    if (s === 'ACCEPTED') return 'ACCEPTED';
    if (s === 'DONE') return 'DONE';
    if (s === 'CANCELLED') return 'CANCELLED';
    return null;
  }

  private async sendPushToUserIds(
    userIds: string[],
    payload: { title: string; message: string; url: string },
  ): Promise<{ subscriptionsFound: number; success: number; failed: number }> {
    const unique = Array.from(new Set(userIds.filter(Boolean)));
    if (unique.length === 0) {
      return { subscriptionsFound: 0, success: 0, failed: 0 };
    }

    const subs = await this.prisma.pushSubscription.findMany({
      where: { userId: { in: unique } },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });

    if (!subs.length) {
      return { subscriptionsFound: 0, success: 0, failed: 0 };
    }

    let success = 0;
    let failed = 0;

    const chunkSize = 100;
    for (let i = 0; i < subs.length; i += chunkSize) {
      const chunk = subs.slice(i, i + chunkSize);
      const settled = await Promise.allSettled(
        chunk.map((s: any) =>
          webpush.sendNotification(
            {
              endpoint: s.endpoint,
              keys: { p256dh: s.p256dh, auth: s.auth },
            } as any,
            JSON.stringify({
              title: payload.title,
              body: payload.message,
              url: payload.url,
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

    return { subscriptionsFound: subs.length, success, failed };
  }

  private async notifyAllCouriersReady(orderId: string, restaurantName?: string) {
    // Use users with role COURIER instead of Courier table,
    // otherwise couriers won't receive notifications until they open their panel.
    const courierUsers = await this.prisma.user.findMany({
      where: { role: 'COURIER', status: 'ACTIVE' },
      select: { id: true },
    });
    const courierUserIds = courierUsers.map((u) => u.id);
    await this.sendPushToUserIds(courierUserIds, {
      title: 'Minutka',
      message: `${restaurantName ? restaurantName + ': ' : ''}yangi READY buyurtma #${orderId.slice(0, 8)}`,
      url: '/courier',
    });
  }

  private async notifyOtherCouriersOrderTaken(
    orderId: string,
    takenByCourierUserId: string,
    restaurantName?: string,
  ) {
    const courierUsers = await this.prisma.user.findMany({
      where: { role: 'COURIER', status: 'ACTIVE' },
      select: { id: true },
    });
    const courierUserIds = courierUsers
      .map((u) => u.id)
      .filter((id: string) => id && id !== takenByCourierUserId);
    await this.sendPushToUserIds(courierUserIds, {
      title: 'Minutka',
      message: `${restaurantName ? restaurantName + ': ' : ''}buyurtma allaqachon olindi #${orderId.slice(0, 8)}`,
      url: '/courier',
    });
  }

  private async notifyCustomerOnTheWay(customerId: string, orderId: string) {
    await this.sendPushToUserIds([customerId], {
      title: 'Minutka',
      message: `Buyurtmangiz yo‘lda (#${orderId.slice(0, 8)})`,
      url: '/profile',
    });
  }

  async takeOrder(orderId: string, courierUserId: string) {
    const existing = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true, courierId: true },
    });

    if (!existing) {
      throw new BadRequestException('Order not found');
    }
    if (existing.courierId) {
      throw new BadRequestException('Order already taken');
    }
    if (existing.status !== 'READY') {
      throw new BadRequestException('Order not READY');
    }

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
      const after = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: { courierId: true },
      });
      if (after?.courierId) {
        throw new BadRequestException('Order already taken');
      }
      throw new BadRequestException('Order not available');
    }

    const takenOrder = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          select: {
            id: true,
            quantity: true,
            price: true,
            dish: { select: { name: true } },
          },
        },
        address: true,
        restaurant: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    await this.notifyOtherCouriersOrderTaken(
      orderId,
      courierUserId,
      (takenOrder as any)?.restaurant?.name,
    );

    return takenOrder;
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
      select: { id: true, status: true, restaurantId: true, courierId: true, customerId: true },
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

    await this.prisma.transaction(async (tx) => {
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

    if (status === 'READY') {
      const restaurant = await this.prisma.restaurant.findUnique({
        where: { id: order!.restaurantId },
        select: { name: true },
      });
      void this.notifyAllCouriersReady(id, restaurant?.name).catch(() => {});
    }

    if (status === 'ON_THE_WAY' && order?.customerId) {
      void this.notifyCustomerOnTheWay(order.customerId, id).catch(() => {});
    }

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

  async findForRestaurant(
    restaurantId: string,
    opts?: { limit?: number; offset?: number; status?: string },
  ) {
    const take = opts?.limit;
    const skip = opts?.offset;
    // Restaurant "Yangi" view should include both NEW and ACCEPTED.
    // Otherwise orders disappear right after "Qabul qilish".
    let whereStatus: any;
    if (opts?.status) {
      const s = opts.status.toUpperCase();
      if (s === 'NEW') whereStatus = { in: ['NEW', 'ACCEPTED'] };
      else if (s === 'READY') whereStatus = 'READY';
      else if (s === 'IN_PATH') whereStatus = 'ON_THE_WAY';
      else whereStatus = this.mapStatusFilter(opts.status);
    } else {
      whereStatus = { notIn: ['DONE', 'CANCELLED'] };
    }

    return this.prisma.order.findMany({
      where: { restaurantId, status: whereStatus as any },
      orderBy: { createdAt: 'desc' },
      ...(typeof take === 'number' ? { take } : {}),
      ...(typeof skip === 'number' ? { skip } : {}),
      include: {
        items: {
          select: {
            id: true,
            quantity: true,
            price: true,
            dish: { select: { name: true } },
          },
        },
        address: true,
        customer: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
  }

  /** Barcha faol restoranlar buyurtmalari — kuryerlar ro‘yxati uchun */
  async findForCourier(
    courierUserId: string,
    opts?: { limit?: number; offset?: number; scope?: 'pool' | 'mine' },
  ) {
    const courier = await this.prisma.courier.upsert({
      where: { userId: courierUserId },
      create: { userId: courierUserId },
      update: {},
    });

    const take = typeof opts?.limit === 'number' ? opts.limit : 300;
    const skip = typeof opts?.offset === 'number' ? opts.offset : 0;

    // Mening buyurtmalarim: faqat bu kuryerga biriktirilgan, faol yetkazib berish.
    if (opts?.scope === 'mine') {
      return this.prisma.order.findMany({
        where: {
          restaurant: { isActive: true },
          courierId: courier.id,
          status: { in: ['READY', 'ON_THE_WAY'] },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: {
          items: {
            select: {
              id: true,
              quantity: true,
              price: true,
              dish: { select: { name: true } },
            },
          },
          address: true,
          restaurant: { select: { name: true } },
          customer: { select: { id: true, name: true, email: true, phone: true } },
        },
      });
    }

    // Yangi (pool): barcha ko‘rinadigan faol buyurtmalar — tayyor (olib olish mumkin) + mening jarayondagilar.
    // DONE/CANCELLED chiqarilmaydi.
    const where: any = {
      restaurant: { isActive: true },
      status: { notIn: ['DONE', 'CANCELLED'] },
      OR: [{ status: 'READY', courierId: null }, { courierId: courier.id }],
    };

    return this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      include: {
        items: {
          select: {
            id: true,
            quantity: true,
            price: true,
            dish: { select: { name: true } },
          },
        },
        address: true,
        restaurant: { select: { name: true } },
        customer: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
  }

  async hasRestaurantOrdersChanges(
    restaurantId: string,
    opts?: { status?: string; sinceIso?: string },
  ): Promise<{ changed: boolean; lastUpdatedAt: string | null }> {
    if (!opts?.sinceIso) return { changed: true, lastUpdatedAt: null };
    const since = new Date(opts.sinceIso);
    if (Number.isNaN(since.getTime())) return { changed: true, lastUpdatedAt: null };

    let whereStatus: any;
    if (opts?.status) {
      const s = opts.status.toUpperCase();
      if (s === 'NEW') whereStatus = { in: ['NEW', 'ACCEPTED'] };
      else if (s === 'READY') whereStatus = 'READY';
      else if (s === 'IN_PATH') whereStatus = 'ON_THE_WAY';
      else whereStatus = this.mapStatusFilter(opts.status);
    } else {
      whereStatus = { notIn: ['DONE', 'CANCELLED'] };
    }

    const latest = await this.prisma.order.findFirst({
      where: { restaurantId, status: whereStatus as any },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    });
    if (!latest) return { changed: false, lastUpdatedAt: null };
    return {
      changed: latest.updatedAt.getTime() > since.getTime(),
      lastUpdatedAt: latest.updatedAt.toISOString(),
    };
  }

  async hasCourierOrdersChanges(
    courierUserId: string,
    opts?: { scope?: 'pool' | 'mine'; sinceIso?: string },
  ): Promise<{ changed: boolean; lastUpdatedAt: string | null }> {
    if (!opts?.sinceIso) return { changed: true, lastUpdatedAt: null };
    const since = new Date(opts.sinceIso);
    if (Number.isNaN(since.getTime())) return { changed: true, lastUpdatedAt: null };

    const courier = await this.prisma.courier.upsert({
      where: { userId: courierUserId },
      create: { userId: courierUserId },
      update: {},
    });

    const where =
      opts?.scope === 'mine'
        ? {
            restaurant: { isActive: true },
            courierId: courier.id,
            status: { in: ['READY', 'ON_THE_WAY'] },
          }
        : {
            restaurant: { isActive: true },
            status: { notIn: ['DONE', 'CANCELLED'] },
            OR: [{ status: 'READY', courierId: null }, { courierId: courier.id }],
          };

    const latest = await this.prisma.order.findFirst({
      where: where as any,
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    });
    if (!latest) return { changed: false, lastUpdatedAt: null };
    return {
      changed: latest.updatedAt.getTime() > since.getTime(),
      lastUpdatedAt: latest.updatedAt.toISOString(),
    };
  }

  async deleteOrdersOlderThanDays(days: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const old = await this.prisma.order.findMany({
      where: { createdAt: { lt: cutoff } },
      select: { id: true },
    });
    const ids = old.map((o) => o.id);
    if (!ids.length) return 0;
    const dt = this.prisma.deliveryTracking;
    await Promise.all([
      dt ? dt.deleteMany({ where: { orderId: { in: ids } } }).catch(() => {}) : Promise.resolve(),
      this.prisma.orderItem.deleteMany({ where: { orderId: { in: ids } } }),
      this.prisma.payment.deleteMany({ where: { orderId: { in: ids } } }).catch(() => {}),
    ]);
    await this.prisma.order.deleteMany({ where: { id: { in: ids } } }).catch(() => {});
    return ids.length;
  }

  private scheduleArchiveCleanup(days: number) {
    const nowMs = Date.now();
    const minIntervalMs = 15 * 60 * 1000;
    if (nowMs - this.lastArchiveCleanupAtMs < minIntervalMs) return;
    this.lastArchiveCleanupAtMs = nowMs;
    void this.deleteOrdersOlderThanDays(days).catch(() => {});
  }

  async findArchiveForRestaurant(restaurantId: string) {
    this.scheduleArchiveCleanup(3);
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
    const [restaurant, doneAgg, activeCount] = await Promise.all([
      this.prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: { platformFeePercent: true },
      }),
      this.prisma.order.aggregate({
        where: { restaurantId, status: 'DONE' },
        _count: { id: true },
        _sum: { total: true },
      }),
      this.prisma.order.count({
        where: {
          restaurantId,
          status: { notIn: ['DONE', 'CANCELLED'] },
        },
      }),
    ]);
    const percent = restaurant?.platformFeePercent != null ? Number(restaurant.platformFeePercent) : 10;
    const totalRevenue = Number(doneAgg._sum.total ?? 0);
    const totalPlatformFee = (totalRevenue * percent) / 100;
    return {
      activeOrdersCount: activeCount,
      deliveredOrdersCount: doneAgg._count.id ?? 0,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      platformFeePercent: percent,
      totalPlatformFee: Math.round(totalPlatformFee * 100) / 100,
    };
  }
}
