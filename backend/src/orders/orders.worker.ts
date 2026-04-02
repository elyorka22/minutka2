import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

type CreateOrderJobData = {
  customerId: string | null;
  dto: CreateOrderDto;
};

@Injectable()
export class OrdersWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrdersWorker.name);
  private worker!: Worker<CreateOrderJobData>;
  private connection!: IORedis;

  constructor(private readonly ordersService: OrdersService) {}

  private get redisUrl(): string {
    const v = process.env.ORDERS_REDIS_URL || process.env.REDIS_URL;
    if (!v) throw new Error('ORDERS_REDIS_URL (or REDIS_URL) is not set');
    return v;
  }

  async onModuleInit() {
    const queueEnabled = process.env.ORDERS_QUEUE_ENABLED === 'true';
    if (!queueEnabled) {
      this.logger.log('OrdersWorker disabled (ORDERS_QUEUE_ENABLED != true)');
      return;
    }
    const concurrency = Number(process.env.ORDERS_WORKER_CONCURRENCY ?? 2);
    if (!Number.isFinite(concurrency) || concurrency < 1) {
      // eslint-disable-next-line no-console
      console.warn(`[orders.worker] bad concurrency=${process.env.ORDERS_WORKER_CONCURRENCY}, fallback to 2`);
    }

    this.connection = new IORedis(this.redisUrl, { maxRetriesPerRequest: null });
    try {
      await this.connection.ping();
      this.logger.log('Redis connected');
    } catch (e: any) {
      // eslint-disable-next-line no-console
      this.logger.warn(`Redis ping failed: ${e?.message ?? String(e)}`);
    }

    this.worker = new Worker(
      'orders',
      async (job: Job<CreateOrderJobData>) => {
        const { customerId, dto } = job.data;
        const startedAt = Date.now();
        try {
          await this.ordersService.create(customerId, dto);
          return { ok: true };
        } catch (err: any) {
          const ms = Date.now() - startedAt;
          this.logger.error(
            `[orders.worker] job failed id=${job.id} durationMs=${ms} err=${err?.message ?? String(err)}`,
          );
          throw err;
        }
      },
      {
        connection: this.connection,
        concurrency: Number.isFinite(concurrency) && concurrency >= 1 ? concurrency : 2,
      },
    );

    this.logger.log('Worker started');
    this.logger.log(`OrdersWorker started with concurrency=${concurrency}`);
  }

  async onModuleDestroy() {
    await this.worker?.close().catch(() => {});
    try {
      this.connection?.disconnect();
    } catch {
      // ignore
    }
  }
}

