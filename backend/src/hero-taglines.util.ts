/** Bosh sahifa hero tagline — bir qatorda bir nechta variant (JSON massiv). */

export const DEFAULT_HERO_LINE1 = ['TAOMLAR.'];
export const DEFAULT_HERO_LINE2 = ['YETKAZILADI.'];

const MAX_VARIANTS = 15;
const MAX_CHARS = 200;

export function heroLinesForPublicApi(raw: unknown, fallback: string[]): string[] {
  if (!Array.isArray(raw)) return fallback;
  const out = raw
    .map((x) => String(x ?? '').trim())
    .filter(Boolean)
    .slice(0, MAX_VARIANTS)
    .map((s) => s.slice(0, MAX_CHARS));
  return out.length > 0 ? out : fallback;
}

/** PATCH: string massivi; massiv bo‘lmasa xato. */
export function sanitizeHeroLinesInput(input: unknown): string[] {
  if (!Array.isArray(input)) {
    throw new Error('INVALID_HERO_LINES');
  }
  return input
    .map((x) => String(x ?? '').trim())
    .filter(Boolean)
    .slice(0, MAX_VARIANTS)
    .map((s) => s.slice(0, MAX_CHARS));
}
