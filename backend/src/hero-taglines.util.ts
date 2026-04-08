/** Bosh sahifa hero tagline — bir qatorda bir nechta variant (JSON massiv). */

export const DEFAULT_HERO_LINE1 = ['TAOMLAR.'];
export const DEFAULT_HERO_LINE2 = ['YETKAZILADI.'];

const MAX_VARIANTS = 15;
const MAX_CHARS = 200;
const MAX_URL_LEN = 2048;

/** Vergul, nuqtali vergul, | — bir qatorda bir nechta so‘z bo‘lsa alohida variant. */
function expandInlineVariants(parts: string[]): string[] {
  const out: string[] = [];
  for (const p of parts) {
    const s = p.trim();
    if (!s) continue;
    for (const chunk of s.split(/[,;|]/)) {
      const t = chunk.trim();
      if (t) out.push(t);
    }
  }
  return out;
}

export function heroLinesForPublicApi(raw: unknown, fallback: string[]): string[] {
  if (!Array.isArray(raw)) return fallback;
  const flat = expandInlineVariants(
    raw.map((x) => String(x ?? '').trim()).filter(Boolean),
  )
    .slice(0, MAX_VARIANTS)
    .map((s) => s.slice(0, MAX_CHARS));
  return flat.length > 0 ? flat : fallback;
}

/** PATCH: string massivi; massiv bo‘lmasa xato. */
export function sanitizeHeroLinesInput(input: unknown): string[] {
  if (!Array.isArray(input)) {
    throw new Error('INVALID_HERO_LINES');
  }
  const flat = expandInlineVariants(
    input.map((x) => String(x ?? '').trim()).filter(Boolean),
  )
    .slice(0, MAX_VARIANTS)
    .map((s) => s.slice(0, MAX_CHARS));
  return flat;
}

/** DB dan kelgan URL massivini matn variantlari uzunligiga moslashtiradi (bo‘sh qator — rasm yo‘q). */
export function padImageUrlsToTextCount(textCount: number, raw: unknown): string[] {
  const urls = Array.isArray(raw)
    ? raw.map((x) => String(x ?? '').trim().slice(0, MAX_URL_LEN))
    : [];
  const out: string[] = [];
  for (let i = 0; i < textCount; i++) {
    out.push(urls[i] ?? '');
  }
  return out;
}

/** PATCH: rasm URL massivi (vergul URL ichida bo‘lishi mumkin — massiv elementlari butun URL). */
export function sanitizeHeroImageUrlsInput(input: unknown): string[] {
  if (!Array.isArray(input)) {
    throw new Error('INVALID_HERO_IMAGES');
  }
  return input
    .map((x) => String(x ?? '').trim().slice(0, MAX_URL_LEN))
    .slice(0, MAX_VARIANTS);
}

/** Javob: i-variant uchun rasm yoki null */
export function heroImageUrlsForPublicApi(texts: string[], raw: unknown): (string | null)[] {
  if (texts.length === 0) return [];
  const padded = padImageUrlsToTextCount(texts.length, raw);
  return padded.map((u) => (u.length > 0 ? u : null));
}
