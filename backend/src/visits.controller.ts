import { Controller, Post } from '@nestjs/common';
import { VisitsService } from './visits.service';

@Controller('visit')
export class VisitsController {
  constructor(private readonly visitsService: VisitsService) {}

  @Post()
  async record() {
    await this.visitsService.record();
    return { ok: true };
  }
}
