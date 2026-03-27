import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getCorsOptions } from './cors.config';
import * as express from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { gzipSync } from 'zlib';

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
  expressApp.use((req: any, res: any, next: any) => {
    const accept = String(req.headers?.['accept-encoding'] ?? '');
    if (!accept.includes('gzip')) return next();
    const originalSend = res.send.bind(res);
    res.send = (body: any) => {
      if (res.getHeader('Content-Encoding')) return originalSend(body);
      if (typeof body !== 'string' && !Buffer.isBuffer(body)) return originalSend(body);
      const asBuffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
      if (asBuffer.length < 1024) return originalSend(body);
      const contentType = String(res.getHeader('Content-Type') ?? '');
      if (!contentType.includes('application/json') && !contentType.includes('text/')) {
        return originalSend(body);
      }
      const gzipped = gzipSync(asBuffer);
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Vary', 'Accept-Encoding');
      res.setHeader('Content-Length', gzipped.length);
      return originalSend(gzipped);
    };
    next();
  });
  expressApp.use((req: any, res: any, next: any) => {
    if (!String(req.path ?? '').startsWith('/admin')) return next();
    const startedAt = Date.now();
    const method = String(req.method ?? 'GET');
    const url = String(req.originalUrl ?? req.url ?? '');
    const slowMs = Number(process.env.ADMIN_SLOW_REQUEST_MS ?? 800);
    res.on('finish', () => {
      const durationMs = Date.now() - startedAt;
      const status = Number(res.statusCode ?? 0);
      const line = `[perf][admin] ${method} ${url} -> ${status} ${durationMs}ms`;
      if (durationMs >= slowMs) {
        // eslint-disable-next-line no-console
        console.warn(`${line} [SLOW]`);
      } else {
        // eslint-disable-next-line no-console
        console.log(line);
      }
    });
    next();
  });
  const uploadsDir = path.join(process.cwd(), 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });
  app.use('/uploads', express.static(uploadsDir));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
