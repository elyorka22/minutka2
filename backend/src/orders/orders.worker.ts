import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { getOrdersRedisConnection } from './orders.queue';

function isTruthyEnv(v: unknown): boolean {
  if (typeof v !== 'string') return false;
  const s = v.trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes' || s === 'y';
}

type CreateOrderJobData = {
  customerId: string | null;
  dto: CreateOrderDto;
};

@Injectable()
export class OrdersWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrdersWorker.name);
  private worker!: Worker<CreateOrderJobData>;

  constructor(private readonly ordersService: OrdersService) {}

  private get redisUrl(): string {
    const v = process.env.ORDERS_REDIS_URL || process.env.REDIS_URL;
    if (!v) throw new Error('ORDERS_REDIS_URL (or REDIS_URL) is not set');
    return v;
  }

  async onModuleInit() {
    const queueEnabled = isTruthyEnv(process.env.ORDERS_QUEUE_ENABLED);
    if (!queueEnabled) {
      this.logger.log('OrdersWorker disabled (ORDERS_QUEUE_ENABLED != true)');
      return;
    }
    const concurrencyRaw = Number(process.env.ORDERS_WORKER_CONCURRENCY ?? 2);
    if (!Number.isFinite(concurrencyRaw) || concurrencyRaw < 1) {
      // eslint-disable-next-line no-console
      console.warn(`[orders.worker] bad concurrency=${process.env.ORDERS_WORKER_CONCURRENCY}, fallback to 2`);
    }
    const effectiveConcurrency =
      Number.isFinite(concurrencyRaw) && concurrencyRaw >= 1 ? concurrencyRaw : 2;

    const connection = getOrdersRedisConnection(this.redisUrl);
    try {
      await connection.ping();
      this.logger.log('Redis connected');
    } catch (e: any) {
      // eslint-disable-next-line no-console
      this.logger.warn(`Redis ping failed: ${e?.message ?? String(e)}`);
    }

    this.worker = new Worker(
      'orders',
      async (job: Job<CreateOrderJobData>) => {
        const { customerId, dto } = job.data;
        const start = Date.now();
        // Explicit logs requested for quick runtime verification in Railway.
        // eslint-disable-next-line no-console
        console.log('Processing job', job.id);
        this.logger.log(`[orders.worker] processing job id=${job.id} name=${job.name}`);
        try {
          await this.ordersService.create(customerId, dto, {
            lightweight: true,
            skipCustomerExistsCheck: true,
          });
          const ms = Date.now() - start;
          // eslint-disable-next-line no-console
          console.log('Finished job', job.id, `durationMs=${ms}`);
          this.logger.log(`[orders.worker] done job id=${job.id} durationMs=${ms}`);
          return { ok: true };
        } catch (err: any) {
          const ms = Date.now() - start;
          // eslint-disable-next-line no-console
          console.log('Failed job', job.id, `durationMs=${ms}`);
          this.logger.error(
            `[orders.worker] job failed id=${job.id} durationMs=${ms} err=${err?.message ?? String(err)}`,
          );
          throw err;
        }
      },
      {
        connection,
        concurrency: effectiveConcurrency,
      },
    );

    this.logger.log('Worker started');
    this.logger.log(`OrdersWorker started with concurrency=${effectiveConcurrency}`);

    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `[orders.worker] failed event id=${job?.id} err=${err?.message ?? String(err)}`,
      );
    });
    this.worker.on('completed', (job) => {
      this.logger.log(`[orders.worker] completed event id=${job?.id}`);
    });
  }

  async onModuleDestroy() {
    await this.worker?.close().catch(() => {});
  }
}

