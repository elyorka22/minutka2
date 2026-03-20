import { BadRequestException, Body, Controller, ForbiddenException, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth/auth.service';
import { PrismaService } from './prisma.service';
import { UsersService } from './users/users.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const webpush = require('web-push');

@Controller('push')
export class PushController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {
    const publicKey = process.env.PUBLIC_VAPID_KEY;
    const privateKey = process.env.PRIVATE_VAPID_KEY;
    if (publicKey && privateKey) {
      webpush.setVapidDetails('mailto:admin@minut-ka.uz', publicKey, privateKey);
    }
  }

  @Post('subscribe')
  async subscribe(@Body() body: any, @Req() req: any) {
    const sub = body?.subscription ?? body;
    const endpoint = sub?.endpoint;
    const p256dh = sub?.keys?.p256dh;
    const auth = sub?.keys?.auth;
    if (!endpoint || !p256dh || !auth) {
      throw new BadRequestException('Invalid subscription payload');
    }

    let userId: string | null = null;
    const authHeader = req?.headers?.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.slice(7);
        const payload = this.authService.verifyToken(token);
        userId = payload.sub ?? null;
      } catch {
        userId = null;
      }
    }

    // Если пользователь не авторизован — привязываем подписку к guest-пользователю,
    // чтобы push при заказах гостя тоже доставлялся.
    if (!userId) {
      userId = await this.usersService.findOrCreateGuestUser();
    }

    await this.prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh, auth, userId },
      create: { endpoint, p256dh, auth, userId },
    });
    return { ok: true };
  }

  /**
   * Test endpoint: sends a notification to all saved subscriptions.
   * Protected by PUSH_SEND_SECRET (header: x-push-secret).
   */
  @Post('send')
  async send(
    @Body() body: { title?: string; message?: string; url?: string },
    @Req() req: any,
  ) {
    const secret = process.env.PUSH_SEND_SECRET;
    if (secret) {
      const provided = String(req?.headers?.['x-push-secret'] ?? '');
      if (provided !== secret) {
        throw new ForbiddenException('Forbidden');
      }
    } else {
      throw new ForbiddenException('PUSH_SEND_SECRET is not set');
    }

    const title = String(body?.title ?? '').trim() || 'Minutka';
    const message = String(body?.message ?? '').trim() || 'Test bildirishnoma';
    const url = String(body?.url ?? '/').trim() || '/';

    const subs = await this.prisma.pushSubscription.findMany();
    let success = 0;
    let failed = 0;

    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: s.endpoint,
              keys: { p256dh: s.p256dh, auth: s.auth },
            } as any,
            JSON.stringify({ title, body: message, url }),
          );
          success += 1;
        } catch (e: any) {
          failed += 1;
          if (e?.statusCode === 410 || e?.statusCode === 404) {
            await this.prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
          }
        }
      }),
    );

    return { ok: true, total: subs.length, success, failed };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: any) {
    const userId = req?.user?.id as string | undefined;
    if (!userId) {
      throw new BadRequestException('Unauthorized');
    }
    const count = await this.prisma.pushSubscription.count({ where: { userId } });
    return { subscribed: count > 0, count };
  }
}

