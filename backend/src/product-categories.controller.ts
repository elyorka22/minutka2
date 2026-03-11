import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('product-categories')
export class ProductCategoriesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findActive() {
    return this.prisma.productCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }
}

