import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class PwaInstallService {
  constructor(private readonly prisma: PrismaService) {}

  async record(): Promise<void> {
    await this.prisma.pwaInstall.create({ data: {} });
  }

  async count(): Promise<number> {
    return this.prisma.pwaInstall.count();
  }
}
