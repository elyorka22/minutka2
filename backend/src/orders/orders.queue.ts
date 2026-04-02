import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, JobsOptions } from 'bullmq';
import IORedis from 'ioredis';
import { CreateOrderDto } from './dto/create-order.dto';

type CreateOrderJobData = {
  customerId: string | null;
  dto: CreateOrderDto;
};

@Injectable()
export class OrdersQueue implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrdersQueue.name);
  private queue!: Queue<CreateOrderJobData>;
  private connection!: IORedis;

  private get redisUrl(): string {
    const v = process.env.ORDERS_REDIS_URL || process.env.REDIS_URL;
    if (!v) throw new Error('ORDERS_REDIS_URL (or REDIS_URL) is not set');
    return v;
  }

  async onModuleInit() {
    const queueEnabled = process.env.ORDERS_QUEUE_ENABLED === 'true';
    if (!queueEnabled) {
      this.logger.log('OrdersQueue disabled (ORDERS_QUEUE_ENABLED != true)');
      return;
    }

    // Upstash usually works via a single redis URL (may be rediss://).
    this.connection = new IORedis(this.redisUrl, { maxRetriesPerRequest: null });
    try {
      await this.connection.ping();
      this.logger.log('Redis connected');
    } catch (e: any) {
      // eslint-disable-next-line no-console
      this.logger.warn(`Redis ping failed: ${e?.message ?? String(e)}`);
    }
    this.queue = new Queue<CreateOrderJobData>('orders', { connection: this.connection });
    this.logger.log('Orders queue initialized');
  }

  async onModuleDestroy() {
    await this.queue?.close().catch(() => {});
    try {
      this.connection?.disconnect();
    } catch {
      // ignore
    }
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
    return { jobId: String(job.id) };
  }
}

