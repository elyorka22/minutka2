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

@Module({
  imports: [AuthModule, UsersModule],
  providers: [OrdersService],
  controllers: [
    OrdersController,
    CourierOrdersController,
    RestaurantOrdersController,
    RestaurantSettingsController,
  ],
  exports: [OrdersService],
})
export class OrdersModule {}
