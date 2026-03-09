import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateOrderDto, @Req() req: { user?: { id: string } }) {
    const userId = req.user?.id;
    if (!userId) throw new Error('Unauthorized');
    return this.ordersService.create(userId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findMyOrders(@Req() req: { user?: { id: string } }) {
    const userId = req.user?.id;
    if (!userId) throw new Error('Unauthorized');
    return this.ordersService.findForCustomer(userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string, @Req() req: { user?: { id: string } }) {
    const userId = req.user?.id;
    return this.ordersService.findOne(id, userId ?? undefined);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: 'NEW' | 'ACCEPTED' | 'COOKING' | 'DELIVERING' | 'DELIVERED' | 'CANCELLED',
  ) {
    return this.ordersService.updateStatus(id, status);
  }
}

@Controller('restaurants/:restaurantId/orders')
export class RestaurantOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findForRestaurant(@Param('restaurantId') restaurantId: string) {
    return this.ordersService.findForRestaurant(restaurantId);
  }
}
