import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CacheService } from '../cache.service';

@Injectable()
export class MenuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async getCategories(restaurantId: string) {
    return this.cache.getOrSet(`menu:categories:${restaurantId}`, 60_000, () =>
      this.prisma.category.findMany({
        where: { restaurantId },
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          name: true,
          sortOrder: true,
          dishes: {
            where: { isAvailable: true },
            orderBy: { name: 'asc' },
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

  async getDishes(restaurantId: string, categoryId?: string) {
    const cacheKey = `menu:dishes:${restaurantId}:${categoryId ?? 'all'}`;
    const where: { restaurantId: string; categoryId?: string; isAvailable: boolean } = {
      restaurantId,
      isAvailable: true,
    };
    if (categoryId) where.categoryId = categoryId;
    return this.cache.getOrSet(cacheKey, 60_000, () =>
      this.prisma.dish.findMany({
        where,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          imageUrl: true,
          categoryId: true,
          isAvailable: true,
        },
      }),
    );
  }

  async getDish(id: string) {
    return this.cache.getOrSet(`menu:dish:${id}`, 60_000, () =>
      this.prisma.dish.findFirst({
        where: { id, isAvailable: true },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          imageUrl: true,
          categoryId: true,
          restaurantId: true,
          isAvailable: true,
        },
      }),
    );
  }
}
