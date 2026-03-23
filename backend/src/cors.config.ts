import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/**
 * CORS_ORIGINS — vergul bilan ajratilgan ro'yxat, masalan:
 *   https://minutka.uz,https://www.minutka.uz
 * CORS_ORIGINS=* — barcha originlarga ruxsat (faqat kerak bo'lsa).
 * Productionda ro'yxatni aniq ko'rsating; bo'sh qoldirilsa — cross-origin bloklanadi.
 */
export function getCorsOptions(): CorsOptions {
  const raw = process.env.CORS_ORIGINS?.trim();

  if (raw === '*') {
    return { origin: true, credentials: true };
  }

  if (raw) {
    const list = raw.split(',').map((s) => s.trim()).filter(Boolean);
    return { origin: list.length ? list : false, credentials: true };
  }

  if (process.env.NODE_ENV === 'production') {
    // eslint-disable-next-line no-console
    console.warn(
      '[cors] CORS_ORIGINS o‘rnatilmagan (production). Brauzerdan boshqa domen so‘rovlari bloklanadi. .env da CORS_ORIGINS qo‘ying.',
    );
    return { origin: false, credentials: true };
  }

  return {
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3001',
    ],
    credentials: true,
  };
}
