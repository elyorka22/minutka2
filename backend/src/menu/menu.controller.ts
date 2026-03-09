import { Controller, Get, Param, Query } from '@nestjs/common';
import { MenuService } from './menu.service';

@Controller('restaurants/:restaurantId')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get('categories')
  getCategories(@Param('restaurantId') restaurantId: string) {
    return this.menuService.getCategories(restaurantId);
  }

  @Get('dishes')
  getDishes(
    @Param('restaurantId') restaurantId: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.menuService.getDishes(restaurantId, categoryId);
  }
}

@Controller('dishes')
export class DishesController {
  constructor(private readonly menuService: MenuService) {}

  @Get(':id')
  getDish(@Param('id') id: string) {
    return this.menuService.getDish(id);
  }
}
