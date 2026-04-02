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
  providers: [OrdersService, OrdersQueue, OrdersWorker],
  controllers: [
    OrdersController,
    CourierOrdersController,
    RestaurantOrdersController,
    RestaurantSettingsController,
  ],
  exports: [OrdersService],
})
export class OrdersModule {}
