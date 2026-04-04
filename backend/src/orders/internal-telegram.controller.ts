import { Controller, ForbiddenException, Get, Param, Query } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { OrdersService } from './orders.service';

/**
 * Server-to-server routes for the Telegram bot (no JWT).
 * Secured by HMAC sig on orderId (see OrdersService.verifyCourierTelegramOrderId).
 */
@SkipThrottle()
@Controller('internal/telegram')
export class InternalTelegramController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('courier-order/:orderId')
  async courierOrder(@Param('orderId') orderId: string, @Query('sig') sig?: string) {
    const s = typeof sig === 'string' ? sig.trim() : '';
    if (!s) {
      throw new ForbiddenException('Missing sig');
    }
    return this.ordersService.getTelegramCourierOrderDetailsForBot(orderId, s);
  }
}
