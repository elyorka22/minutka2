import { Module } from '@nestjs/common';
import { MenuService } from './menu.service';
import { MenuController, DishesController } from './menu.controller';

@Module({
  providers: [MenuService],
  controllers: [MenuController, DishesController],
  exports: [MenuService],
})
export class MenuModule {}
