import { Controller, ForbiddenException, Get, Param, Query } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { OrdersService } from './orders.service';

/**
 * Server-to-server routes for the Telegram bot (no JWT).
 * Secured by HMAC sig on orderId (courier vs restaurant — turli xil prefiks).
 */
@SkipThrottle()
@Controller('internal/telegram')
export class InternalTelegramController {
  constructor(private readonly ordersService: OrdersService) {}

  /** Telegram / PUBLIC_API_URL tekshiruvi: brauzerda GET .../internal/telegram/ping */
  @Get('ping')
  ping() {
    return { ok: true, service: 'minutka-api', ts: new Date().toISOString() };
  }

  @Get('courier-order/:orderId')
  async courierOrder(@Param('orderId') orderId: string, @Query('sig') sig?: string) {
    const s = typeof sig === 'string' ? sig.trim() : '';
    if (!s) {
      throw new ForbiddenException('Missing sig');
    }
    return this.ordersService.getTelegramCourierOrderDetailsForBot(orderId, s);
  }

  @Get('restaurant-order/:orderId/accept')
  async restaurantAccept(@Param('orderId') orderId: string, @Query('sig') sig?: string) {
    const s = typeof sig === 'string' ? sig.trim() : '';
    if (!s) throw new ForbiddenException('Missing sig');
    return this.ordersService.telegramRestaurantAcceptOrder(orderId, s);
  }

  @Get('restaurant-order/:orderId/ready')
  async restaurantReady(@Param('orderId') orderId: string, @Query('sig') sig?: string) {
    const s = typeof sig === 'string' ? sig.trim() : '';
    if (!s) throw new ForbiddenException('Missing sig');
    return this.ordersService.telegramRestaurantReadyOrder(orderId, s);
  }
}
