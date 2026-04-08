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

/** API dan kelgan rasm URLlari matn variantlari bilan bir xil indeksda. */
export function alignHeroImagesToLines(
  textLines: string[],
  urls: (string | null)[] | undefined,
): (string | null)[] {
  return textLines.map((_, i) => {
    const u = urls?.[i];
    if (u == null || typeof u !== "string") return null;
    const t = u.trim();
    return t.length > 0 ? t : null;
  });
}

/** Admin: har bir qatorda bitta URL (vergul URL ichida — yangi qator). */
export function parseHeroImageTextareaToUrls(text: string): string[] {
  return text.split(/\r?\n/).map((x) => x.trim());
}

/** Matn variantlari soniga qadar URL (kam bo‘lsa bo‘sh qator). */
export function padImageUrlsToVariantCount(urls: string[], variantCount: number): string[] {
  const out = urls.slice(0, variantCount);
  while (out.length < variantCount) out.push("");
  return out;
}
