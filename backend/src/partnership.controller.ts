import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('partnership')
export class PartnershipController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('applications')
  async createApplication(
    @Body()
    body: {
      name?: string;
      phone?: string;
      businessName?: string;
      businessType?: string;
      details?: string;
      contactMethod?: string;
    },
  ) {
    const name = String(body?.name ?? '').trim();
    const phone = String(body?.phone ?? '').trim();
    const businessName = String(body?.businessName ?? '').trim();

    if (!name) throw new BadRequestException('name is required');
    if (!phone) throw new BadRequestException('phone is required');
    if (!businessName) throw new BadRequestException('businessName is required');

    const created = await this.prisma.partnershipApplication.create({
      data: {
        name,
        phone,
        businessName,
        businessType: body.businessType?.trim() || null,
        details: body.details?.trim() || null,
        contactMethod: body.contactMethod?.trim() || null,
      },
    });

    return { ok: true, id: created.id };
  }
}
