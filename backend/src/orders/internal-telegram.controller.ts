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

  /** Telegram "Buyurtmani olish" — READY pooldan olish (chat ID bo'yicha kuryer aniqlanadi). */
  @Get('courier-order/:orderId/take')
  async courierOrderTake(
    @Param('orderId') orderId: string,
    @Query('sig') sig?: string,
    @Query('telegramChatId') telegramChatId?: string,
  ) {
    const s = typeof sig === 'string' ? sig.trim() : '';
    if (!s) throw new ForbiddenException('Missing sig');
    const chat = typeof telegramChatId === 'string' ? telegramChatId.trim() : '';
    if (!chat) throw new ForbiddenException('Missing telegramChatId');
    return this.ordersService.telegramCourierTakeOrder(orderId, s, chat);
  }

  /** Telegram "Yo‘lda" — READY → ON_THE_WAY. */
  @Get('courier-order/:orderId/on-the-way')
  async courierOrderOnTheWay(
    @Param('orderId') orderId: string,
    @Query('sig') sig?: string,
    @Query('telegramChatId') telegramChatId?: string,
  ) {
    const s = typeof sig === 'string' ? sig.trim() : '';
    if (!s) throw new ForbiddenException('Missing sig');
    const chat = typeof telegramChatId === 'string' ? telegramChatId.trim() : '';
    if (!chat) throw new ForbiddenException('Missing telegramChatId');
    return this.ordersService.telegramCourierMarkOnTheWay(orderId, s, chat);
  }

  /** Telegram «Yetkazildi» — ON_THE_WAY → DONE (faqat biriktirilgan kuryerning telegramChatId si). */
  @Get('courier-order/:orderId/delivered')
  async courierOrderDelivered(
    @Param('orderId') orderId: string,
    @Query('sig') sig?: string,
    @Query('telegramChatId') telegramChatId?: string,
  ) {
    const s = typeof sig === 'string' ? sig.trim() : '';
    if (!s) throw new ForbiddenException('Missing sig');
    const chat = typeof telegramChatId === 'string' ? telegramChatId.trim() : '';
    if (!chat) throw new ForbiddenException('Missing telegramChatId');
    return this.ordersService.telegramCourierMarkDelivered(orderId, s, chat);
  }

  /** Telegram «Batafsil» — holatni o‘zgartirmaydi. */
  @Get('restaurant-order/:orderId/details')
  async restaurantOrderDetails(@Param('orderId') orderId: string, @Query('sig') sig?: string) {
    const s = typeof sig === 'string' ? sig.trim() : '';
    if (!s) throw new ForbiddenException('Missing sig');
    return this.ordersService.getTelegramRestaurantOrderDetailsForBot(orderId, s);
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
