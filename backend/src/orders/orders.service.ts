import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
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

/** Kuryer: total/subtotal/serviceFee/deliveryFee yo‘q — faqat pozitsiyalar va narxlar (taom narxi). */
const COURIER_ORDER_API_SELECT = {
  id: true,
  shortCode: true,
  status: true,
  courierId: true,
  createdAt: true,
  updatedAt: true,
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
} as const;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
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

  private getArchiveRetentionDays(): number {
    const raw = Number(process.env.ARCHIVE_RETENTION_DAYS ?? 30);
    if (!Number.isFinite(raw)) return 30;
    // Reasonable safety bounds: keep at least a week, cap at 10 years.
    return Math.min(Math.max(Math.trunc(raw), 7), 3650);
  }

  private formatOrderCode(shortCode: number): string {
    // Short code is used as a human-friendly order identifier.
    // With load-test optimizations we increased the range to 6 digits.
    return String(shortCode).padStart(6, '0');
  }

  /**
   * Генерируем кандидат shortCode без предварительного SELECT.
   * Уникальность проверяется на уровне INSERT через catch (P2002) в create().
   *
   * Это уменьшает нагрузку на Postgres: вместо (SELECT + INSERT) делаем только INSERT.
   */
  private generateOrderShortCodeCandidate(): number {
    // 6-digit range to reduce collisions under concurrent load:
    // [100000..999999] => 900,000 distinct values.
    return 100000 + Math.floor(Math.random() * 900000);
  }

  async create(
    customerId: string | null,
    dto: CreateOrderDto,
    options?: {
      lightweight?: boolean;
      skipCustomerExistsCheck?: boolean;
      /** Web-push to restaurant admins only (not Telegram). */
      skipNotifications?: boolean;
      /** Telegram /notify to bot (separate from DISABLE_PUSH and skipNotifications). */
      skipTelegram?: boolean;
    },
  ) {
    let userId =
      customerId ?? (await this.usersService.findOrCreateGuestUser(dto.clientKey));
    const disablePush = process.env.DISABLE_PUSH === 'true';
    const disableTelegramEnv = process.env.DISABLE_TELEGRAM_NOTIFY === 'true';
    const lightweight = options?.lightweight === true;
    const skipCustomerExistsCheck = options?.skipCustomerExistsCheck === true;
    const skipPushNotifications = options?.skipNotifications === true;
    const skipTelegram =
      disableTelegramEnv || options?.skipTelegram === true;
    const requestedDishIds = Array.from(new Set(dto.items.map((i) => i.dishId)));

    // Run independent reads in parallel to cut request/job latency.
    const [userExists, restaurant, dishes] = await Promise.all([
      customerId && !skipCustomerExistsCheck
        ? this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true },
          })
        : Promise.resolve<{ id: string } | null>({ id: userId }),
      this.prisma.restaurant.findUnique({
        where: { id: dto.restaurantId, isActive: true },
        select: {
          id: true,
          name: true,
          deliveryFee: true,
          telegramChatId: true,
          ...(disablePush || skipPushNotifications
            ? {}
            : { admins: { select: { id: true } } }),
        },
      }),
      this.prisma.dish.findMany({
        where: { id: { in: requestedDishIds }, restaurantId: dto.restaurantId, isAvailable: true },
        select: { id: true, price: true, name: true },
      }),
    ]);

    // JWT user may be deleted after token issue; fallback to guest account.
    if (customerId && !skipCustomerExistsCheck && !userExists) {
      userId = await this.usersService.findOrCreateGuestUser(dto.clientKey);
    }

    if (!restaurant) throw new Error('Restaurant not found');

    const deliveryFee = Number(restaurant.deliveryFee);
    const serviceFeeRate = 0.1;
    let subtotal = 0;

    const dishById = new Map(dishes.map((d) => [d.id, Number(d.price)]));
    const dishNameById = new Map(dishes.map((d) => [d.id, d.name]));
    for (const item of dto.items) {
      const price = dishById.get(item.dishId);
      if (price == null) throw new Error(`Dish ${item.dishId} not found`);
      subtotal += price * item.quantity;
    }

    const serviceFee = Math.round(subtotal * serviceFeeRate * 100) / 100;
    const total = Math.round((subtotal + deliveryFee + serviceFee) * 100) / 100;

    const createdOrder = await this.prisma.transaction(async (tx) => {
      let createdOrder: {
        id: string;
        shortCode: number;
        total: unknown;
        createdAt: Date;
      } | null = null;

      for (let attempt = 0; attempt < 10; attempt++) {
        const shortCode = this.generateOrderShortCodeCandidate();
        try {
          createdOrder = await tx.order.create({
            data: {
              shortCode,
              customer: { connect: { id: userId } },
              restaurant: { connect: { id: dto.restaurantId } },
              address: {
                create: {
                  user: { connect: { id: userId } },
                  label: dto.address.label,
                  street: dto.address.street,
                  city: dto.address.city,
                  details: dto.address.details,
                  latitude: dto.address.latitude,
                  longitude: dto.address.longitude,
                },
              },
              comment: dto.comment,
              subtotal,
              deliveryFee,
              serviceFee,
              total,
              items: {
                create: dto.items.map((item) => {
                  const p = dishById.get(item.dishId);
                  return {
                    dish: { connect: { id: item.dishId } },
                    quantity: item.quantity,
                    price: p ?? 0,
                  };
                }),
              },
            },
            select: {
              id: true,
              shortCode: true,
              total: true,
              createdAt: true,
            },
          });
          break;
        } catch (e: any) {
          const isUniqueConflict =
            e?.code === 'P2002' &&
            Array.isArray(e?.meta?.target) &&
            e.meta.target.includes('shortCode');
          if (!isUniqueConflict) throw e;
        }
      }
      if (!createdOrder) throw new BadRequestException('Order short code generation failed');

      if (dto.paymentMethod === 'CARD') {
        await tx.payment.create({
          data: {
            orderId: createdOrder.id,
            provider: 'demo',
            amount: createdOrder.total,
            method: 'CARD',
            status: 'SUCCEEDED',
          },
        });
      }

      return createdOrder;
    });

    const notifyUrl = (process.env.TELEGRAM_BOT_NOTIFY_URL ?? '').trim();
    const rawChatId = (restaurant as { telegramChatId?: string | null }).telegramChatId;
    const chatIds =
      typeof rawChatId === 'string'
        ? rawChatId
            .split(/[,;\n\r\s]+/g)
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

    if (!skipTelegram && notifyUrl && chatIds.length > 0) {
      void (async () => {
        const base = notifyUrl.replace(/\/$/, '');
        const phone = dto.address?.details?.replace(/^Tel:\s*/i, '') ?? '';
        const telegramItems = dto.items.map((item) => {
          const unit = dishById.get(item.dishId) ?? 0;
          return {
            name: dishNameById.get(item.dishId) ?? '—',
            quantity: item.quantity,
            unitPrice: unit,
            lineTotal: unit * item.quantity,
          };
        });

        // Send separate messages to every saved chatId.
        await Promise.all(
          chatIds.map(async (chatId) => {
            const payload = {
              chatId,
              order: {
                id: createdOrder.id,
                shortCode: this.formatOrderCode(createdOrder.shortCode),
                restaurantName: restaurant.name,
                total: Number(createdOrder.total),
                customerName: '',
                phone,
                lat: dto.address?.latitude,
                lng: dto.address?.longitude,
                addressLine: [dto.address.street, dto.address.city].filter(Boolean).join(', ') || undefined,
                comment: dto.comment?.trim() || undefined,
                items: telegramItems,
              },
            };
            try {
              const res = await fetchWithRetry(`${base}/notify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });
              if (!res.ok) {
                const text = await res.text().catch(() => '');
                this.logger.warn(
                  `[telegram] /notify HTTP ${res.status} chatId=${String(chatId).slice(0, 30)} restaurantId=${dto.restaurantId} body=${text.slice(
                    0,
                    200,
                  )}`,
                );
              }
            } catch (e: unknown) {
              this.logger.warn(
                `[telegram] /notify failed chatId=${String(chatId).slice(0, 30)} restaurantId=${dto.restaurantId} err=${
                  e instanceof Error ? e.message : String(e)
                }`,
              );
            }
          }),
        );
      })();
    } else if (!skipTelegram) {
      if (!notifyUrl) {
        this.logger.warn(
          `[telegram] skip: TELEGRAM_BOT_NOTIFY_URL is empty (set it on API and worker to your bot service URL) order=${createdOrder.id}`,
        );
      } else {
        this.logger.warn(
          `[telegram] skip: restaurant.telegramChatId empty restaurantId=${dto.restaurantId} order=${createdOrder.id}`,
        );
      }
    }

    // Web-push to restaurant admins about a new order.
    // Never block order creation; but do not swallow errors silently.
    if (!disablePush && !skipPushNotifications) {
      void (async () => {
        try {
          const adminUserIds = (restaurant as any).admins?.map((u: { id: string }) => u.id).filter(Boolean) ?? [];

          void this.sendPushToUserIds(adminUserIds, {
            title: 'Minutka',
            message: `Yangi buyurtma #${this.formatOrderCode(createdOrder.shortCode)}`,
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
      })();
    }

    if (lightweight) {
      return createdOrder as any;
    }

    const order = await this.prisma.order.findUnique({
      where: { id: createdOrder.id },
      select: {
        id: true,
        shortCode: true,
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
    if (!order) {
      throw new BadRequestException('Order creation failed');
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
    if (process.env.DISABLE_PUSH === 'true') {
      return { subscriptionsFound: 0, success: 0, failed: 0 };
    }
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

  private async notifyAllCouriersReady(orderCode: string, restaurantName?: string) {
    // Use users with role COURIER instead of Courier table,
    // otherwise couriers won't receive notifications until they open their panel.
    const courierUsers = await this.prisma.user.findMany({
      where: { role: 'COURIER', status: 'ACTIVE' },
      select: { id: true },
    });
    const courierUserIds = courierUsers.map((u) => u.id);
    await this.sendPushToUserIds(courierUserIds, {
      title: 'Minutka',
      message: `${restaurantName ? restaurantName + ': ' : ''}yangi READY buyurtma #${orderCode}`,
      url: '/courier',
    });
  }

  private async notifyOtherCouriersOrderTaken(
    orderCode: string,
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
      message: `${restaurantName ? restaurantName + ': ' : ''}buyurtma allaqachon olindi #${orderCode}`,
      url: '/courier',
    });
  }

  private async notifyCustomerOnTheWay(customerId: string, orderCode: string) {
    await this.sendPushToUserIds([customerId], {
      title: 'Minutka',
      message: `Buyurtmangiz yo‘lda (#${orderCode})`,
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
      select: COURIER_ORDER_API_SELECT,
    });

    await this.notifyOtherCouriersOrderTaken(
      this.formatOrderCode((takenOrder as any)?.shortCode ?? 0),
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
      select: { id: true, shortCode: true, status: true, restaurantId: true, courierId: true, customerId: true },
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
      void this.notifyAllCouriersReady(this.formatOrderCode(order.shortCode), restaurant?.name).catch(() => {});
    }

    if (status === 'ON_THE_WAY' && order?.customerId) {
      void this.notifyCustomerOnTheWay(order.customerId, this.formatOrderCode(order.shortCode)).catch(() => {});
    }

    if (isCourier) {
      return this.prisma.order.findUnique({
        where: { id },
        select: COURIER_ORDER_API_SELECT,
      });
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
            dish: { select: { name: true, description: true } },
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
        select: COURIER_ORDER_API_SELECT,
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
      select: COURIER_ORDER_API_SELECT,
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

  /**
   * DONE orders for this courier, grouped by calendar day in Asia/Tashkent (last update ≈ delivery).
   */
  async getCourierDeliveredByDay(
    courierUserId: string,
    days?: number,
  ): Promise<{ days: number; total: number; byDay: Array<{ date: string; count: number }> }> {
    const capped = Math.min(Math.max(Math.trunc(Number(days)) || 60, 1), 366);
    const courier = await this.prisma.courier.findUnique({
      where: { userId: courierUserId },
      select: { id: true },
    });
    if (!courier) {
      return { days: capped, total: 0, byDay: [] };
    }

    const rows = await this.prisma.$queryRaw<Array<{ day: string; count: number }>>`
      SELECT
        to_char(date_trunc('day', o."updatedAt" AT TIME ZONE 'Asia/Tashkent'), 'YYYY-MM-DD') AS day,
        COUNT(*)::int AS count
      FROM "Order" o
      WHERE o."courierId" = ${courier.id}
        AND o.status = 'DONE'
        AND o."updatedAt" >= (
          date_trunc(
            'day',
            (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tashkent') - (${capped}::int * INTERVAL '1 day')
          ) AT TIME ZONE 'Asia/Tashkent'
        )
      GROUP BY date_trunc('day', o."updatedAt" AT TIME ZONE 'Asia/Tashkent')
      ORDER BY day DESC
    `;

    const byDay = rows.map((r) => ({ date: r.day, count: Number(r.count) }));
    const total = byDay.reduce((s, r) => s + r.count, 0);
    return { days: capped, total, byDay };
  }

  async deleteOrdersOlderThanDays(days: number): Promise<number> {
    const safeDays = Math.min(Math.max(Math.trunc(days), 7), 3650);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - safeDays);
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
    const retentionDays = this.getArchiveRetentionDays();
    this.scheduleArchiveCleanup(retentionDays);
    const since = new Date();
    since.setDate(since.getDate() - retentionDays);
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
