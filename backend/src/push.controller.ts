import { Body, Controller, Post } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('push')
export class PushController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('subscribe')
  async subscribe(@Body() body: any) {
    const sub = body?.subscription ?? body;
    const endpoint = sub?.endpoint;
    const p256dh = sub?.keys?.p256dh;
    const auth = sub?.keys?.auth;
    if (!endpoint || !p256dh || !auth) {
      throw new Error('Invalid subscription payload');
    }
    await this.prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh, auth },
      create: { endpoint, p256dh, auth },
    });
    return { ok: true };
  }
}

