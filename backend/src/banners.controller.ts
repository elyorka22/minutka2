import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CacheService } from './cache.service';

@Controller('banners')
export class BannersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  @Get()
  async findActive() {
    return this.cache.getOrSet('home:banners:active', 60_000, () =>
      this.prisma.banner.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          title: true,
          text: true,
          imageUrl: true,
          ctaLabel: true,
          ctaHref: true,
          sortOrder: true,
        },
      }),
    );
  }
}

