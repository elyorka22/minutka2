import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CacheService } from '../cache.service';

@Injectable()
export class RestaurantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async findAll(query?: { search?: string; isActive?: boolean }) {
    const cacheKey = `restaurants:list:${query?.search ?? ''}:${String(query?.isActive)}`;
    const where: { isActive?: boolean; name?: { contains: string; mode: 'insensitive' } } = {};
    // By default, public API returns only active places.
    where.isActive = query?.isActive !== undefined ? query.isActive : true;
    if (query?.search) where.name = { contains: query.search, mode: 'insensitive' };
    return this.cache.getOrSet(cacheKey, 60_000, () =>
      this.prisma.restaurant.findMany({
        where,
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
    );
  }

  async findOne(id: string) {
    return this.cache.getOrSet(`restaurants:one:${id}`, 30_000, () =>
      this.prisma.restaurant.findUnique({
        where: { id, isActive: true },
        select: {
          id: true,
          name: true,
          description: true,
          address: true,
          latitude: true,
          longitude: true,
          minOrderTotal: true,
          deliveryFee: true,
          deliveryRadiusM: true,
          rating: true,
          logoUrl: true,
          coverUrl: true,
          categories: {
            orderBy: { sortOrder: 'asc' },
            select: { id: true, name: true, sortOrder: true },
          },
          dishes: {
            where: { isAvailable: true },
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
              imageUrl: true,
              categoryId: true,
              isAvailable: true,
            },
          },
        },
      }),
    );
  }

  async findFeatured() {
    return this.cache.getOrSet('restaurants:featured', 60_000, () =>
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
    );
  }
}
