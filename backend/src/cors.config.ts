import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

function normalizeOrigin(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

/**
 * CORS_ORIGINS — vergul bilan ajratilgan ro'yxat, masalan:
 *   https://minut-ka.uz,https://www.minut-ka.uz
 * CORS_ORIGINS=* — barcha originlarga ruxsat (faqat kerak bo'lsa).
 * Productionda ro'yxatni aniq ko'rsating; bo'sh qoldirilsa — cross-origin bloklanadi.
 * Domen brauzerdagi Origin bilan bir xil bo'lishi kerak (www / defis / https).
 */
export function getCorsOptions(): CorsOptions {
  const raw = process.env.CORS_ORIGINS?.trim();

  const base: Pick<CorsOptions, 'credentials' | 'methods' | 'allowedHeaders'> = {
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  };

  if (raw === '*') {
    return { ...base, origin: true };
  }

  if (raw) {
    const allowed = new Set(
      raw
        .split(',')
        .map((s) => normalizeOrigin(s))
        .filter(Boolean),
    );
    if (!allowed.size) {
      return { ...base, origin: false };
    }
    return {
      ...base,
      origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
        if (!origin) {
          cb(null, true);
          return;
        }
        cb(null, allowed.has(normalizeOrigin(origin)));
      },
    };
  }

  if (process.env.NODE_ENV === 'production') {
    // eslint-disable-next-line no-console
    console.warn(
      '[cors] CORS_ORIGINS o‘rnatilmagan (production). Brauzerdan boshqa domen so‘rovlari bloklanadi. .env da CORS_ORIGINS qo‘ying.',
    );
    return { ...base, origin: false };
  }

  return {
    ...base,
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3001',
    ],
  };
}
