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

/** PostgreSQL / Prisma: migratsiya qo‘llanmagan bo‘lsa `carouselRow` ustuni yo‘q */
export function isMissingCarouselRowColumnError(err: unknown): boolean {
  const m = String((err as { message?: string })?.message ?? '');
  if (/42703/.test(m)) return true;
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
