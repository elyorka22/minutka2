import { Controller, Get, Header } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @SkipThrottle()
  @Header('Cache-Control', 'no-store')
  async check() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { ok: true, database: 'up', at: new Date().toISOString() };
  }
}
