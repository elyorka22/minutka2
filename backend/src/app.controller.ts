import { Controller, Get, Header } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * Loader.io verification endpoint.
   * Required URL:
   * `/loaderio-9f049725a5e26b44b8fb8348638b095c.txt`
   */
  @Get('/loaderio-9f049725a5e26b44b8fb8348638b095c.txt')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  loaderioVerification(): string {
    return 'loaderio-9f049725a5e26b44b8fb8348638b095c';
  }
}
