import { Module } from '@nestjs/common';
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

@Module({
  imports: [AuthModule, UsersModule],
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
