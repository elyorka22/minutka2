import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminController } from './admin.controller';
import { ProductsController } from './products.controller';
import { ProductCategoriesController } from './product-categories.controller';
import { BannersController } from './banners.controller';
import { PushController } from './push.controller';
import { PrismaModule } from './prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { MenuModule } from './menu/menu.module';
import { OrdersModule } from './orders/orders.module';
import { VisitsModule } from './visits.module';
import { CacheModule } from './cache.module';
import { HomepageModule } from './homepage/homepage.module';
import { HealthController } from './health/health.controller';
import { StorageService } from './storage/storage.service';

@Module({
  imports: [
    CacheModule,
    HomepageModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'default',
          ttl: 60000,
          limit: 400,
        },
      ],
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    RestaurantsModule,
    MenuModule,
    OrdersModule,
    VisitsModule,
  ],
  controllers: [
    AppController,
    AdminController,
    ProductsController,
    BannersController,
    ProductCategoriesController,
    PushController,
    HealthController,
  ],
  providers: [AppService, StorageService],
})
export class AppModule {}
