/** Bosh sahifa hero tagline — bir qatorda bir nechta variant (JSON massiv). */

export const DEFAULT_HERO_LINE1 = ['TAOMLAR.'];
export const DEFAULT_HERO_LINE2 = ['YETKAZILADI.'];

const MAX_VARIANTS = 15;
const MAX_CHARS = 200;

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
