/** Bir qatorda vergul, nuqtali vergul yoki | orqali ajratilgan alohida variantlar. */

const INLINE_SEP = /[,;|]/;

/** Admin textarea: har qator va har bir qatordagi ajratuvchilar bo‘yicha variantlar. */
export function parseHeroTextareaToVariants(text: string): string[] {
  return text
    .split(/\r?\n/)
    .flatMap((row) => row.split(INLINE_SEP))
    .map((x) => x.trim())
    .filter(Boolean);
}

/** API dan kelgan massiv: har bir element ichidagi "a, b" ni alohida variantlarga ajratadi. */
export function expandHeroVariantsFromApi(raw: string[] | undefined): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    const s = String(item ?? "").trim();
    if (!s) continue;
    for (const part of s.split(INLINE_SEP)) {
      const t = part.trim();
      if (t) out.push(t);
    }
  }
  return out;
}

export function normalizeHeroLines(raw: string[] | undefined, fallback: string): string[] {
  const expanded = expandHeroVariantsFromApi(raw);
  return expanded.length > 0 ? expanded : [fallback];
}
