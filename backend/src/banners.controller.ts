import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CacheService } from './cache.service';
import { bannerFindManyPublicSafe } from './banner-image-focus-column.util';

@Controller('banners')
export class BannersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  @Get()
  async findActive() {
    return this.cache.getOrSet('home:banners:active', 60_000, () =>
      bannerFindManyPublicSafe(this.prisma, {
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
    );
  }
}

