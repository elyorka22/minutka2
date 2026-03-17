import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private client: InstanceType<typeof PrismaClient>;

  constructor() {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL is not set');
    }
    const adapter = new PrismaPg({ connectionString: url });
    this.client = new PrismaClient({ adapter });
  }

  async onModuleInit() {
    await this.client.$connect();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }

  get user() {
    return this.client.user;
  }

  get restaurant() {
    return this.client.restaurant;
  }

  get category() {
    return this.client.category;
  }

  get dish() {
    return this.client.dish;
  }

  get order() {
    return this.client.order;
  }

  get orderItem() {
    return this.client.orderItem;
  }

  get address() {
    return this.client.address;
  }

  get payment() {
    return this.client.payment;
  }

  get deliveryTracking() {
    return (this.client as any).deliveryTracking;
  }

  get promoCode() {
    return this.client.promoCode;
  }

  get courier() {
    return this.client.courier;
  }

  get product() {
    return (this.client as any).product;
  }

  get banner() {
    return (this.client as any).banner;
  }

  get productCategory() {
    return (this.client as any).productCategory;
  }

  get visit() {
    return (this.client as any).visit;
  }

  get pushSubscription() {
    return (this.client as any).pushSubscription;
  }
}
