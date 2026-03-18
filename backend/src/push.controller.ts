import { BadRequestException, Body, Controller, ForbiddenException, Post, Req } from '@nestjs/common';
import { PrismaService } from './prisma.service';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const webpush = require('web-push');

@Controller('push')
export class PushController {
  constructor(private readonly prisma: PrismaService) {
    const publicKey = process.env.PUBLIC_VAPID_KEY;
    const privateKey = process.env.PRIVATE_VAPID_KEY;
    if (publicKey && privateKey) {
      webpush.setVapidDetails('mailto:admin@minut-ka.uz', publicKey, privateKey);
    }
  }

  @Post('subscribe')
  async subscribe(@Body() body: any) {
    const sub = body?.subscription ?? body;
    const endpoint = sub?.endpoint;
    const p256dh = sub?.keys?.p256dh;
    const auth = sub?.keys?.auth;
    if (!endpoint || !p256dh || !auth) {
      throw new BadRequestException('Invalid subscription payload');
    }
    await this.prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh, auth },
      create: { endpoint, p256dh, auth },
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
}

