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

/** If false, do not run BullMQ consumer in this process (use a dedicated Railway worker service). Default: run worker in API. */
function ordersWorkerInThisProcess(): boolean {
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
