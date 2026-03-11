import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('banners')
export class BannersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findActive() {
    return this.prisma.banner.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }
}

