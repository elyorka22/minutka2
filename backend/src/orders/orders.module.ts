import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OrdersService } from './orders.service';
import {
  CourierOrdersController,
  OrdersController,
  RestaurantOrdersController,
  RestaurantSettingsController,
} from './orders.controller';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { OrdersQueue } from './orders.queue';
import { OrdersWorker } from './orders.worker';
import { ORDERS_QUEUE_NAME } from './orders.constants';

/**
 * Dedicated worker entry (worker.main.ts) sets ORDERS_FORCE_WORKER=1 before loading AppModule,
 * so the consumer runs even if ORDERS_WORKER_IN_API=false was copied from the API service.
 * On the API service, ORDERS_WORKER_IN_API=false disables the in-process consumer.
 */
function ordersWorkerInThisProcess(): boolean {
  const force = String(process.env.ORDERS_FORCE_WORKER ?? '').trim().toLowerCase();
  if (force === 'true' || force === '1' || force === 'yes' || force === 'y') return true;
  const v = (process.env.ORDERS_WORKER_IN_API ?? 'true').trim().toLowerCase();
  return v !== 'false' && v !== '0' && v !== 'no';
}

@Module({
  imports: [
    AuthModule,
    UsersModule,
    BullModule.forRoot({
      connection: {
        url: process.env.ORDERS_REDIS_URL || process.env.REDIS_URL,
      },
    }),
    BullModule.registerQueue({
      name: ORDERS_QUEUE_NAME,
    }),
  ],
  providers: [
    OrdersService,
    OrdersQueue,
    ...(ordersWorkerInThisProcess() ? [OrdersWorker] : []),
  ],
  controllers: [
    OrdersController,
    CourierOrdersController,
    RestaurantOrdersController,
    RestaurantSettingsController,
  ],
  exports: [OrdersService],
})
export class OrdersModule {}
