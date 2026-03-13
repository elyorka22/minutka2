import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class RestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query?: { search?: string; isActive?: boolean }) {
    const where: { isActive?: boolean; name?: { contains: string; mode: 'insensitive' } } = {};
    // По умолчанию на публичном сайте показываем только активные заведения
    where.isActive = query?.isActive !== undefined ? query.isActive : true;
    if (query?.search) where.name = { contains: query.search, mode: 'insensitive' };
    return this.prisma.restaurant.findMany({
      where,
      orderBy: { rating: 'desc' },
      include: {
        categories: { orderBy: { sortOrder: 'asc' } },
        dishes: { where: { isAvailable: true } },
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.restaurant.findUnique({
      where: { id, isActive: true },
      include: {
        categories: { orderBy: { sortOrder: 'asc' }, include: { dishes: { where: { isAvailable: true } } } },
        dishes: { where: { isAvailable: true } },
      },
    });
  }
}
