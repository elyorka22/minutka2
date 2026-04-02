import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Job } from 'bullmq';
import { OrdersService } from './orders.service';
import {
  CreateOrderJobData,
  ORDERS_CREATE_JOB,
  ORDERS_QUEUE_NAME,
} from './orders.constants';

const workerConcurrencyRaw = Number(process.env.ORDERS_WORKER_CONCURRENCY ?? 2);
const workerConcurrency =
  Number.isFinite(workerConcurrencyRaw) && workerConcurrencyRaw >= 1
    ? workerConcurrencyRaw
    : 2;
const workerSkipNotificationsRaw =
  (process.env.ORDERS_WORKER_SKIP_NOTIFICATIONS ?? '').trim().toLowerCase();
const workerSkipNotifications =
  workerSkipNotificationsRaw === 'true' ||
  workerSkipNotificationsRaw === '1' ||
  workerSkipNotificationsRaw === 'yes' ||
  workerSkipNotificationsRaw === 'y';

@Processor(ORDERS_QUEUE_NAME, { concurrency: workerConcurrency })
@Injectable()
export class OrdersWorker extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(OrdersWorker.name);

  constructor(private readonly ordersService: OrdersService) {
    super();
  }

  onModuleInit() {
    this.logger.log(
      `Worker started (concurrency=${workerConcurrency}, skipNotifications=${workerSkipNotifications})`,
    );
  }

  async process(job: Job<CreateOrderJobData>): Promise<{ ok: boolean }> {
    if (job.name !== ORDERS_CREATE_JOB) {
      this.logger.warn(`[orders.worker] skipping unknown job name=${job.name}`);
      return { ok: true };
    }
    const { customerId, dto } = job.data;
    const start = Date.now();
    // eslint-disable-next-line no-console
    console.log('Processing job', job.id);
    await this.ordersService.create(customerId, dto, {
      lightweight: true,
      skipCustomerExistsCheck: true,
      skipNotifications: workerSkipNotifications,
    });
    const duration = Date.now() - start;
    // eslint-disable-next-line no-console
    console.log('Finished job', job.id, 'durationMs=', duration);
    return { ok: true };
  }

  @OnWorkerEvent('active')
  onActive(job: Job<CreateOrderJobData>) {
    this.logger.log(`[orders.worker] active id=${job.id} name=${job.name}`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<CreateOrderJobData>) {
    this.logger.log(`[orders.worker] completed id=${job.id} name=${job.name}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<CreateOrderJobData> | undefined, err: Error) {
    this.logger.error(
      `[orders.worker] failed id=${job?.id ?? 'unknown'} err=${err?.message ?? String(err)}`,
    );
  }
}

