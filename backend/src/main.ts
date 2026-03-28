import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getCorsOptions } from './cors.config';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import * as express from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { gzipSync } from 'zlib';

function cacheControlForPublicGet(pathname: string): string | null {
  if (pathname === '/homepage' || pathname === '/banners' || pathname === '/restaurants/featured') {
    return 'public, max-age=30, s-maxage=30, stale-while-revalidate=120';
  }
  if (pathname === '/restaurants' || pathname === '/product-categories' || pathname === '/products') {
    return 'public, max-age=60, s-maxage=60, stale-while-revalidate=180';
  }
  if (pathname.startsWith('/restaurants/') && !pathname.includes('/orders')) {
    return 'public, max-age=30, s-maxage=30, stale-while-revalidate=120';
  }
  return null;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  const corsOpts = getCorsOptions();
  app.enableCors(corsOpts);
  const co = process.env.CORS_ORIGINS?.trim();
  if (co && co !== '*') {
    // eslint-disable-next-line no-console
    console.log(`[cors] CORS_ORIGINS set (${co.split(',').length} entries)`);
  } else if (co === '*') {
    // eslint-disable-next-line no-console
    console.warn('[cors] CORS_ORIGINS=* (all origins)');
  } else if (process.env.NODE_ENV === 'production') {
    // eslint-disable-next-line no-console
    console.warn('[cors] CORS_ORIGINS missing in production — browser requests will fail');
  }
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TimeoutInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);
  expressApp.use((req: any, res: any, next: any) => {
    if (String(req.method ?? '') === 'OPTIONS') {
      return next();
    }
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
  expressApp.use((req: any, res: any, next: any) => {
    if (String(req.method ?? '') !== 'GET') return next();
    const p = String(req.path ?? '');
    if (
      p.startsWith('/admin') ||
      p.startsWith('/auth') ||
      p.startsWith('/orders') ||
      p === '/visit' ||
      p.startsWith('/push') ||
      p.startsWith('/courier')
    ) {
      return next();
    }
    if (p === '/health') {
      res.setHeader('Cache-Control', 'no-store');
      return next();
    }
    const cc = cacheControlForPublicGet(p);
    if (cc) {
      res.setHeader('Cache-Control', cc);
    }
    next();
  });
  const uploadsDir = path.join(process.cwd(), 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });
  app.use('/uploads', express.static(uploadsDir));
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Listening on ${port}`);
}
bootstrap();
