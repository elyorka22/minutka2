import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CacheService } from '../cache.service';
import { buildNationalAndFastCarousels, cardSelect } from './homepage-carousel.util';

@Injectable()
export class HomepageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  getHomepage() {
    return this.cache.getOrSet('homepage:aggregate', 30_000, async () => {
      const [restaurantRows, banners, topCategories] = await Promise.all([
        this.prisma.restaurant.findMany({
          where: { isActive: true },
          orderBy: { rating: 'desc' },
          select: cardSelect,
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

      const { nationalCarousel, fastFoodCarousel } = buildNationalAndFastCarousels(restaurantRows);

      const featured = restaurantRows
        .filter((r) => !r.isSupermarket && r.isFeatured)
        .sort((a, b) => a.featuredSortOrder - b.featuredSortOrder || b.rating - a.rating)
        .slice(0, 20);

      return {
        restaurants: restaurantRows,
        featured,
        nationalCarousel,
        fastFoodCarousel,
        banners,
        topCategories,
      };
    });
  }
}
