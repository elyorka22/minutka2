import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CacheService } from '../cache.service';
import {
  DEFAULT_HERO_LINE1,
  DEFAULT_HERO_LINE2,
  heroImageUrlsForPublicApi,
  heroLinesForPublicApi,
} from '../hero-taglines.util';
import { buildNationalAndFastCarousels, cardSelect } from './homepage-carousel.util';
import { isMissingCarouselRowColumnError } from '../home-explore-carousel-row.util';
import { bannerFindManyPublicSafe } from '../banner-image-focus-column.util';

@Injectable()
export class HomepageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  private async getHomeExploreCategoriesSafe() {
    try {
      return await this.prisma.homeExploreCategory.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        take: 40,
        select: {
          id: true,
          name: true,
          imageUrl: true,
          sortOrder: true,
          searchQuery: true,
        },
      });
    } catch (e) {
      if (isMissingCarouselRowColumnError(e)) {
        return [];
      }
      throw e;
    }
  }

  getHomepage() {
    return this.cache.getOrSet('homepage:aggregate', 30_000, async () => {
      const [restaurantRows, banners, topCategories, exploreCategories, platformRow] = await Promise.all([
        this.prisma.restaurant.findMany({
          where: { isActive: true },
          orderBy: { rating: 'desc' },
          select: cardSelect,
        }),
        bannerFindManyPublicSafe(this.prisma, {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
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
        this.getHomeExploreCategoriesSafe(),
        this.prisma.platformSettings.findUnique({
          where: { id: 'default' },
          select: {
            heroLine1Texts: true,
            heroLine2Texts: true,
            heroLine1ImageUrls: true,
            heroLine2ImageUrls: true,
          },
        }),
      ]);

      const { nationalCarousel, fastFoodCarousel } = buildNationalAndFastCarousels(restaurantRows);

      const featured = restaurantRows
        .filter((r) => !r.isSupermarket && r.isFeatured)
        .sort((a, b) => a.featuredSortOrder - b.featuredSortOrder || b.rating - a.rating)
        .slice(0, 20);

      const heroLine1Texts = heroLinesForPublicApi(platformRow?.heroLine1Texts, DEFAULT_HERO_LINE1);
      const heroLine2Texts = heroLinesForPublicApi(platformRow?.heroLine2Texts, DEFAULT_HERO_LINE2);
      const heroLine1ImageUrls = heroImageUrlsForPublicApi(heroLine1Texts, platformRow?.heroLine1ImageUrls);
      const heroLine2ImageUrls = heroImageUrlsForPublicApi(heroLine2Texts, platformRow?.heroLine2ImageUrls);

      return {
        restaurants: restaurantRows,
        featured,
        nationalCarousel,
        fastFoodCarousel,
        banners,
        topCategories,
        exploreCategories,
        heroLine1Texts,
        heroLine2Texts,
        heroLine1ImageUrls,
        heroLine2ImageUrls,
      };
    });
  }
}
