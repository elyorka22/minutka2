import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CacheService } from '../cache.service';

@Injectable()
export class HomepageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  getHomepage() {
    return this.cache.getOrSet('homepage:aggregate', 30_000, async () => {
      const [restaurants, featured, banners, topCategories] = await Promise.all([
        this.prisma.restaurant.findMany({
          where: { isActive: true },
          orderBy: { rating: 'desc' },
          select: {
            id: true,
            name: true,
            description: true,
            rating: true,
            logoUrl: true,
            coverUrl: true,
            isSupermarket: true,
            isFeatured: true,
            featuredSortOrder: true,
            isActive: true,
          },
        }),
        this.prisma.restaurant.findMany({
          where: { isActive: true, isSupermarket: false, isFeatured: true },
          orderBy: { featuredSortOrder: 'asc' },
          take: 20,
          select: {
            id: true,
            name: true,
            description: true,
            rating: true,
            logoUrl: true,
            coverUrl: true,
            isSupermarket: true,
            isFeatured: true,
            featuredSortOrder: true,
          },
        }),
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
        this.prisma.productCategory.findMany({
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
          take: 30,
          select: {
            id: true,
            name: true,
            imageUrl: true,
            sortOrder: true,
          },
        }),
      ]);

      return { restaurants, featured, banners, topCategories };
    });
  }
}
