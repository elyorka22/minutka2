import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class VisitsService {
  constructor(private readonly prisma: PrismaService) {}

  async record(): Promise<void> {
    await this.prisma.visit.create({ data: {} });
  }

  async getStats(lastDays: number = 7): Promise<{
    byDay: Array<{ date: string; count: number }>;
    byHour: Array<{ hour: number; count: number }>;
    total: number;
  }> {
    const now = new Date();
    const from = new Date(now.getTime() - lastDays * 24 * 60 * 60 * 1000);
    const visits = await this.prisma.visit.findMany({
      where: { createdAt: { gte: from } },
      select: { createdAt: true },
    });

    const total = visits.length;
    const dayMap: Record<string, number> = {};
    const hourMap: Record<number, number> = {};
    for (let h = 0; h < 24; h++) hourMap[h] = 0;

    for (const v of visits) {
      const d = new Date(v.createdAt);
      const dateStr = d.toISOString().slice(0, 10);
      dayMap[dateStr] = (dayMap[dateStr] ?? 0) + 1;
      hourMap[d.getUTCHours()] = (hourMap[d.getUTCHours()] ?? 0) + 1;
    }

    const byDay: Array<{ date: string; count: number }> = [];
    for (let i = lastDays - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      byDay.push({ date: dateStr, count: dayMap[dateStr] ?? 0 });
    }

    const byHour = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: hourMap[h] ?? 0 }));

    return { byDay, byHour, total };
  }
}
