import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  async getCategories(restaurantId: string) {
    return this.prisma.category.findMany({
      where: { restaurantId },
      orderBy: { sortOrder: 'asc' },
      include: { dishes: { where: { isAvailable: true } } },
    });
  }

  async getDishes(restaurantId: string, categoryId?: string) {
    const where: { restaurantId: string; categoryId?: string; isAvailable: boolean } = {
      restaurantId,
      isAvailable: true,
    };
    if (categoryId) where.categoryId = categoryId;
    return this.prisma.dish.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async getDish(id: string) {
    return this.prisma.dish.findFirst({
      where: { id, isAvailable: true },
    });
  }
}
