import { Controller, Get, Header } from '@nestjs/common';
import { HomepageService } from './homepage.service';

@Controller()
export class HomepageController {
  constructor(private readonly homepageService: HomepageService) {}

  @Get('homepage')
  @Header('Cache-Control', 'public, max-age=30, s-maxage=30, stale-while-revalidate=120')
  getHomepage() {
    return this.homepageService.getHomepage();
  }
}
