import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UsersService } from '../users/users.service';
import { CreateOrderDto } from './dto/create-order.dto';

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
      },
    });

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

  async updateStatus(id: string, status: 'NEW' | 'ACCEPTED' | 'COOKING' | 'DELIVERING' | 'DELIVERED' | 'CANCELLED') {
    return this.prisma.order.update({
      where: { id },
      data: { status },
      include: {
        items: { include: { dish: true } },
        restaurant: true,
        address: true,
      },
    });
  }

  async findForRestaurant(restaurantId: string) {
    return this.prisma.order.findMany({
      where: {
        restaurantId,
        status: { notIn: ['DELIVERED', 'CANCELLED'] },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { dish: true } },
        address: true,
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
        status: { in: ['DELIVERED', 'CANCELLED'] },
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
        where: { restaurantId, status: 'DELIVERED' },
        select: { total: true, subtotal: true },
      }),
      this.prisma.order.count({
        where: {
          restaurantId,
          status: { notIn: ['DELIVERED', 'CANCELLED'] },
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
