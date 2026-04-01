import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private client: InstanceType<typeof PrismaClient>;

  constructor() {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL is not set');
    }
    const adapter = new PrismaPg({ connectionString: url });
    const slowMs = Number(process.env.PRISMA_SLOW_QUERY_MS ?? 0);
    const log =
      slowMs > 0 ? ([{ level: 'query' as const, emit: 'event' as const }] as { level: 'query'; emit: 'event' }[]) : [];
    this.client = new PrismaClient({
      adapter,
      ...(log.length ? { log } : {}),
    });
    if (slowMs > 0) {
      (this.client as { $on(event: 'query', cb: (e: { duration: number; query: string }) => void): void }).$on(
        'query',
        (e) => {
          if (e.duration >= slowMs) {
            this.logger.warn(`Slow query ${e.duration}ms: ${e.query?.slice(0, 500)}`);
          }
        },
      );
    }
  }

  async onModuleInit() {
    let last: unknown;
    for (let i = 0; i < 5; i++) {
      try {
        await this.client.$connect();
        return;
      } catch (e) {
        last = e;
        await new Promise((r) => setTimeout(r, 400 * (i + 1)));
      }
    }
    throw last;
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

  get partnershipApplication() {
    return (this.client as any).partnershipApplication;
  }

  /**
   * Helper for interactive transactions.
   * We keep it in PrismaService so other services don't need access to the raw PrismaClient.
   */
  async transaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    return this.client.$transaction(fn);
  }

  $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: any[]): Promise<T> {
    return (this.client as any).$queryRaw(query, ...values);
  }
}
