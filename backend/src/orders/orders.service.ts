import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(customerId: string, dto: CreateOrderDto) {
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
        userId: customerId,
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
        customerId,
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
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { dish: true } },
        address: true,
        customer: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
  }
}
