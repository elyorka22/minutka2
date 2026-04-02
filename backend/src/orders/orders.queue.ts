import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, JobsOptions } from 'bullmq';
import IORedis from 'ioredis';
import { CreateOrderDto } from './dto/create-order.dto';

let sharedRedisConnection: IORedis | null = null;

function isTruthyEnv(v: unknown): boolean {
  if (typeof v !== 'string') return false;
  const s = v.trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes' || s === 'y';
}

export function getOrdersRedisConnection(redisUrl: string): IORedis {
  if (sharedRedisConnection) return sharedRedisConnection;
  sharedRedisConnection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
  return sharedRedisConnection;
}

type CreateOrderJobData = {
  customerId: string | null;
  dto: CreateOrderDto;
};

@Injectable()
export class OrdersQueue implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrdersQueue.name);
  private queue!: Queue<CreateOrderJobData>;

  private get redisUrl(): string {
    const v = process.env.ORDERS_REDIS_URL || process.env.REDIS_URL;
    if (!v) throw new Error('ORDERS_REDIS_URL (or REDIS_URL) is not set');
    return v;
  }

  async onModuleInit() {
    const queueEnabled = isTruthyEnv(process.env.ORDERS_QUEUE_ENABLED);
    if (!queueEnabled) {
      this.logger.log('OrdersQueue disabled (ORDERS_QUEUE_ENABLED != true)');
      return;
    }

    const connection = getOrdersRedisConnection(this.redisUrl);
    try {
      await connection.ping();
      this.logger.log('Redis connected');
    } catch (e: any) {
      // eslint-disable-next-line no-console
      this.logger.warn(`Redis ping failed: ${e?.message ?? String(e)}`);
    }

    this.queue = new Queue<CreateOrderJobData>('orders', { connection });
    this.queue.on('error', (e) => {
      this.logger.error(`[orders.queue] error: ${e?.message ?? String(e)}`);
    });

    this.logger.log('Queue initialized');
  }

  async onModuleDestroy() {
    await this.queue?.close().catch(() => {});
  }

  async enqueueCreateOrder(data: CreateOrderJobData): Promise<{ jobId: string }> {
    if (!this.queue) throw new Error('OrdersQueue is not initialized (queue disabled?)');
    const attempts = Number(process.env.ORDERS_JOB_ATTEMPTS ?? 1);

    const removeOnCompleteAgeSeconds = Number(process.env.ORDERS_JOB_REMOVE_ON_COMPLETE_AGE_SECONDS ?? 3600);
    const removeOnFailAgeSeconds = Number(process.env.ORDERS_JOB_REMOVE_ON_FAIL_AGE_SECONDS ?? 86400);

    const opts: JobsOptions = {
      attempts: Number.isFinite(attempts) && attempts > 0 ? attempts : 1,
      removeOnComplete: { age: removeOnCompleteAgeSeconds },
      removeOnFail: { age: removeOnFailAgeSeconds },
    };

    const job = await this.queue.add('createOrder', data, opts);
    if (!job.id) throw new Error('Failed to get BullMQ job id');
    this.logger.log(`[orders.queue] job added name=createOrder id=${job.id}`);
    return { jobId: String(job.id) };
  }
}

