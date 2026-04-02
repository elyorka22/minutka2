import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { JobsOptions, Queue } from 'bullmq';
import {
  CreateOrderJobData,
  ORDERS_CREATE_JOB,
  ORDERS_QUEUE_NAME,
} from './orders.constants';

@Injectable()
export class OrdersQueue implements OnModuleInit {
  private readonly logger = new Logger(OrdersQueue.name);

  constructor(
    @InjectQueue(ORDERS_QUEUE_NAME)
    private readonly queue: Queue<CreateOrderJobData>,
  ) {}

  async onModuleInit() {
    await this.queue.waitUntilReady();
    this.logger.log('Queue initialized');
    try {
      const client = await this.queue.client;
      await (client as any).ping?.();
      this.logger.log('Redis connected');
    } catch {
      // no-op, queue readiness already validated
    }
  }

  async enqueueCreateOrder(data: CreateOrderJobData): Promise<{ jobId: string }> {
    const attempts = Number(process.env.ORDERS_JOB_ATTEMPTS ?? 1);
    const removeOnCompleteAgeSeconds = Number(
      process.env.ORDERS_JOB_REMOVE_ON_COMPLETE_AGE_SECONDS ?? 3600,
    );
    const removeOnFailAgeSeconds = Number(
      process.env.ORDERS_JOB_REMOVE_ON_FAIL_AGE_SECONDS ?? 86400,
    );

    const opts: JobsOptions = {
      attempts: Number.isFinite(attempts) && attempts > 0 ? attempts : 1,
      removeOnComplete: { age: removeOnCompleteAgeSeconds },
      removeOnFail: { age: removeOnFailAgeSeconds },
    };

    const job = await this.queue.add(ORDERS_CREATE_JOB, data, opts);
    if (!job.id) throw new Error('Failed to get BullMQ job id');
    this.logger.log(`[orders.queue] job added name=${ORDERS_CREATE_JOB} id=${job.id}`);
    return { jobId: String(job.id) };
  }
}

