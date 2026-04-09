import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma.module';
import { PwaInstallController } from './pwa-install.controller';
import { PwaInstallService } from './pwa-install.service';

@Module({
  imports: [PrismaModule],
  controllers: [PwaInstallController],
  providers: [PwaInstallService],
  exports: [PwaInstallService],
})
export class PwaInstallModule {}
