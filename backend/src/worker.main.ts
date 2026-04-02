import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

/**
 * Standalone process: same Nest modules as API, but no HTTP server.
 * BullMQ @Processor (OrdersWorker) registers via BullRegistrar.onModuleInit.
 *
 * IMPORTANT: Do not static-import AppModule at the top — OrdersModule reads
 * ORDERS_WORKER_IN_API before bootstrap() runs. Railway users often copy API env
 * (ORDERS_WORKER_IN_API=false) onto the worker service, which would skip OrdersWorker.
 * We set ORDERS_FORCE_WORKER before loading AppModule so the consumer always registers here.
 */
async function bootstrap() {
  process.env.ORDERS_FORCE_WORKER = '1';

  const redisUrl = process.env.ORDERS_REDIS_URL || process.env.REDIS_URL;
  if (!redisUrl || !String(redisUrl).trim()) {
    const log = new Logger('WorkerMain');
    log.error(
      'Missing REDIS_URL or ORDERS_REDIS_URL. Add the same Redis URL as on the API service.',
    );
    process.exit(1);
  }

  const { AppModule } = await import('./app.module');

  const logger = new Logger('WorkerMain');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  app.enableShutdownHooks();
  logger.log(
    'Orders worker process up (no HTTP). Consuming queue "orders" (createOrder jobs).',
  );
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
