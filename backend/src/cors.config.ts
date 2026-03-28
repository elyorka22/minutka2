import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

function normalizeOrigin(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

const DEV_ORIGINS = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
]);

type CorsMode =
  | { kind: 'wildcard' }
  | { kind: 'list'; set: Set<string> }
  | { kind: 'dev' }
  | { kind: 'none' };

/** CORS_ORIGINS (comma-separated) or single FRONTEND_ORIGIN, e.g. https://www.minut-ka.uz */
function readCorsOriginsRaw(): string | undefined {
  const primary = process.env.CORS_ORIGINS?.trim();
  if (primary === '*') {
    return '*';
  }
  if (primary) {
    return primary;
  }
  return process.env.FRONTEND_ORIGIN?.trim();
}

function getCorsMode(): CorsMode {
  const raw = readCorsOriginsRaw();
  if (raw === '*') {
    return { kind: 'wildcard' };
  }
  if (raw) {
    const set = new Set(
      raw
        .split(',')
        .map((s) => normalizeOrigin(s))
        .filter(Boolean),
    );
    return set.size ? { kind: 'list', set } : { kind: 'none' };
  }
  if (process.env.NODE_ENV === 'production') {
    return { kind: 'none' };
  }
  return { kind: 'dev' };
}

function isOriginAllowed(origin: string): boolean {
  const o = normalizeOrigin(origin);
  const mode = getCorsMode();
  if (mode.kind === 'wildcard') {
    return true;
  }
  if (mode.kind === 'list') {
    return mode.set.has(o);
  }
  if (mode.kind === 'dev') {
    return DEV_ORIGINS.has(o);
  }
  return false;
}

/**
 * Echo Access-Control-Allow-Origin for allowed requests (errors, filters).
 * With credentials, cannot use "*"; reflect the request Origin.
 */
export function reflectAllowedOrigin(originHeader: string | undefined): string | false {
  if (!originHeader) {
    return false;
  }
  return isOriginAllowed(originHeader) ? normalizeOrigin(originHeader) : false;
}

/**
 * CORS_ORIGINS — comma-separated, e.g. https://minut-ka.uz,https://www.minut-ka.uz
 * FRONTEND_ORIGIN — one origin if you prefer a single variable (same as browser URL).
 * CORS_ORIGINS=* — allow all (dev only recommended).
 * Origin must match the browser exactly (https, www, hyphens).
 */
export function getCorsOptions(): CorsOptions {
  const base: Pick<CorsOptions, 'credentials' | 'methods' | 'allowedHeaders' | 'optionsSuccessStatus'> = {
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    optionsSuccessStatus: 204,
  };

  const mode = getCorsMode();

  if (mode.kind === 'wildcard') {
    return { ...base, origin: true };
  }

  if (mode.kind === 'none') {
    if (process.env.NODE_ENV === 'production') {
      // eslint-disable-next-line no-console
      console.warn(
        '[cors] CORS_ORIGINS o‘rnatilmagan (production). Brauzerdan boshqa domen so‘rovlari bloklanadi. .env da CORS_ORIGINS qo‘ying.',
      );
    }
    return { ...base, origin: false };
  }

  if (mode.kind === 'dev') {
    return {
      ...base,
      origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
        if (!origin) {
          cb(null, true);
          return;
        }
        cb(null, DEV_ORIGINS.has(normalizeOrigin(origin)));
      },
    };
  }

  return {
    ...base,
    origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) {
        cb(null, true);
        return;
      }
      cb(null, mode.set.has(normalizeOrigin(origin)));
    },
  };
}
