import { Controller, Post } from '@nestjs/common';
import { PwaInstallService } from './pwa-install.service';

@Controller('pwa-install')
export class PwaInstallController {
  constructor(private readonly pwaInstallService: PwaInstallService) {}

  @Post()
  async record() {
    await this.pwaInstallService.record();
    return { ok: true };
  }
}
