import type { PrismaService } from './prisma.service';

/** Bosh sahifa va ochiq API */
export const BANNER_SELECT_WITH_FOCUS = {
  id: true,
  title: true,
  text: true,
  imageUrl: true,
  ctaLabel: true,
  ctaHref: true,
  sortOrder: true,
  imageFocusX: true,
  imageFocusY: true,
} as const;

export const BANNER_SELECT_LEGACY = {
  id: true,
  title: true,
  text: true,
  imageUrl: true,
  ctaLabel: true,
  ctaHref: true,
  sortOrder: true,
} as const;

const DEFAULT_FOCUS = { imageFocusX: 50, imageFocusY: 50 } as const;

/** PostgreSQL: ustun yo‘q — Prisma `P2022`. Ba’zi versiyalarda `message`da `prisma.banner.findMany` bo‘lmasligi mumkin. */
export function isPrismaColumnNotFoundError(err: unknown): boolean {
  return String((err as { code?: string })?.code ?? '') === 'P2022';
}

/** Prisma ba’zan «The column `(not available)` does not exist» beradi. */
export function isBannerQueryMissingColumnError(err: unknown): boolean {
  if (isPrismaColumnNotFoundError(err)) return true;
  const m = String((err as { message?: string })?.message ?? '');
  if (!/prisma\.banner\.findMany/i.test(m)) return false;
  return (
    /does not exist in the current database/i.test(m) ||
    /\(not available\)/i.test(m)
  );
}

/** create/update — imageFocus ustunlari migratsiyasiz */
export function isBannerMutationMissingFocusColumns(err: unknown): boolean {
  if (isPrismaColumnNotFoundError(err)) return true;
  const m = String((err as { message?: string })?.message ?? '');
  if (!/prisma\.banner\.(create|update)/i.test(m)) return false;
  return /does not exist in the current database/i.test(m) || /\(not available\)/i.test(m);
}

type BannerFindManyArgs = {
  where?: Record<string, unknown>;
  orderBy?: unknown;
  take?: number;
  skip?: number;
};

export async function bannerFindManyPublicSafe(
  prisma: PrismaService,
  args: BannerFindManyArgs,
): Promise<
  Array<{
    id: string;
    title: string | null;
    text: string | null;
    imageUrl: string | null;
    ctaLabel: string | null;
    ctaHref: string | null;
    sortOrder: number;
    imageFocusX: number;
    imageFocusY: number;
  }>
> {
  try {
    const rows = await prisma.banner.findMany({
      ...args,
      select: BANNER_SELECT_WITH_FOCUS,
    });
    return rows as any[];
  } catch (e) {
    if (!isBannerQueryMissingColumnError(e)) throw e;
    const rows = await prisma.banner.findMany({
      ...args,
      select: BANNER_SELECT_LEGACY,
    });
    return (rows as any[]).map((r) => ({ ...r, ...DEFAULT_FOCUS }));
  }
}

/** Admin overview: qo‘shimcha maydonlar */
export async function bannerFindManyOverviewSafe(
  prisma: PrismaService,
  args: BannerFindManyArgs,
): Promise<any[]> {
  const selectWith = {
    ...BANNER_SELECT_WITH_FOCUS,
    isActive: true,
  } as const;
  const selectLegacy = {
    ...BANNER_SELECT_LEGACY,
    isActive: true,
  } as const;
  try {
    return (await prisma.banner.findMany({
      ...args,
      select: selectWith as any,
    })) as any[];
  } catch (e) {
    if (!isBannerQueryMissingColumnError(e)) throw e;
    const rows = await prisma.banner.findMany({
      ...args,
      select: selectLegacy as any,
    });
    return (rows as any[]).map((r) => ({ ...r, ...DEFAULT_FOCUS }));
  }
}

/** GET /admin/banners — barcha ustunlar */
export async function bannerFindManyAdminSafe(prisma: PrismaService): Promise<any[]> {
  try {
    return (await prisma.banner.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    })) as any[];
  } catch (e) {
    if (!isBannerQueryMissingColumnError(e)) throw e;
    const rows = await prisma.banner.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        title: true,
        text: true,
        imageUrl: true,
        ctaLabel: true,
        ctaHref: true,
        sortOrder: true,
        isActive: true,
      },
    });
    return (rows as any[]).map((r) => ({ ...r, ...DEFAULT_FOCUS }));
  }
}
