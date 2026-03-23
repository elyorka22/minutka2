import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getCorsOptions } from './cors.config';
import * as express from 'express';
import * as path from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.enableCors(getCorsOptions());
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);
  const uploadsDir = path.join(process.cwd(), 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });
  app.use('/uploads', express.static(uploadsDir));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
