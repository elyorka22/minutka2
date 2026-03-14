import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController, RestaurantOrdersController } from './orders.controller';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [AuthModule, UsersModule],
  providers: [OrdersService],
  controllers: [OrdersController, RestaurantOrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
