import type { PrismaService } from './prisma.service';

/** Javobda faqat bosh sahifa uchun kerakli maydonlar */
const EXPLORE_HOME_SELECT = {
  id: true,
  name: true,
  imageUrl: true,
  sortOrder: true,
  searchQuery: true,
} as const;

export type HomeExploreHomeRow = {
  id: string;
  name: string;
  imageUrl: string | null;
  sortOrder: number;
  searchQuery: string | null;
};

/**
 * Migratsiya qo‘llanmagan bo‘lsa `carouselRow` ustuni yo‘q.
 * Prisma ba’zan xabarda ustun nomini berib yubormaydi: «The column `(not available)` does not exist» — shuning uchun P2022 va umumiy matn ham tekshiriladi.
 */
export function isMissingCarouselRowColumnError(err: unknown): boolean {
  const code = String((err as { code?: string })?.code ?? '');
  if (code === 'P2022') return true;

  const m = String((err as { message?: string })?.message ?? '');
  if (/P2022/.test(m)) return true;
  if (/42703/.test(m)) return true;
  if (/does not exist in the current database/i.test(m)) return true;
  if (/\(not available\)/i.test(m) && /does not exist/i.test(m)) return true;
  if (/\bcarouselRow\b/i.test(m) && /does not exist|Unknown column|undefined_column|not find/i.test(m)) {
    return true;
  }
  return false;
}

/** Bosh sahifa: ikki qator yoki (migratsiyasiz) bitta qator */
export async function fetchHomeExploreSplit(prisma: PrismaService): Promise<{
  row1: HomeExploreHomeRow[];
  row2: HomeExploreHomeRow[];
}> {
  try {
    const [row1, row2] = await Promise.all([
      prisma.homeExploreCategory.findMany({
        where: { isActive: true, carouselRow: 1 },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        take: 40,
        select: EXPLORE_HOME_SELECT,
      }),
      prisma.homeExploreCategory.findMany({
        where: { isActive: true, carouselRow: 2 },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        take: 40,
        select: EXPLORE_HOME_SELECT,
      }),
    ]);
    return { row1, row2 };
  } catch (e) {
    if (!isMissingCarouselRowColumnError(e)) throw e;
    const all = await prisma.homeExploreCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      take: 40,
      select: EXPLORE_HOME_SELECT,
    });
    return { row1: all, row2: [] };
  }
}
