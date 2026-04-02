import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/**
 * Standalone process: same Nest modules as API, but no HTTP server.
 * BullMQ @Processor (OrdersWorker) still registers and consumes the queue.
 *
 * Railway: duplicate the backend service, set start command to `npm run start:worker`,
 * share env with API (DATABASE_URL, REDIS_URL / ORDERS_REDIS_URL, etc.).
 * On the API service set ORDERS_WORKER_IN_API=false so only this process consumes jobs.
 */
async function bootstrap() {
  const logger = new Logger('WorkerMain');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  app.enableShutdownHooks();
  logger.log('Orders worker process up (no HTTP); BullMQ consumer runs in OrdersWorker.');
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
