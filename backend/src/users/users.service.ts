import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import type { User } from '../../generated/prisma/client';

export type UserEntity = User;

/**
 * Guest users may be created very frequently (e.g. during load tests).
 * bcrypt.hash(...) per guest is a CPU bottleneck.
 *
 * We reuse a single precomputed bcrypt hash for all guests created
 * via `findOrCreateGuestUser()`. Authenticated users keep using
 * `create()` with bcrypt.
 */
const GUEST_FIXED_BCRYPT_HASH = '$2b$10$nlFexvuyAgK9.ZBKIrszM.ZLDVULUYIZW0uamx9KgMS9R6G4Kbv/6';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserDto): Promise<UserEntity> {
    const passwordHash = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        phone: data.phone,
        password: passwordHash,
        role: data.role ?? 'CUSTOMER',
      },
    });
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /** Login uchun — registrni hisobga olmasdan (Admin@x.uz = admin@x.uz) */
  async findByEmailIgnoreCase(email: string): Promise<UserEntity | null> {
    const list = await this.prisma.user.findMany({
      where: { email: { equals: email, mode: 'insensitive' } },
      take: 1,
    });
    return list[0] ?? null;
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findSafeById(id: string): Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    email: string;
    phone: string | null;
    name: string;
    role: string;
    status: string;
  } | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        email: true,
        phone: true,
        name: true,
        role: true,
        status: true,
      },
    }) as any;
  }

  private static readonly GUEST_EMAIL = 'guest@minutka.local';

  private guestEmailForClientKey(clientKey?: string): string {
    if (!clientKey) return UsersService.GUEST_EMAIL;
    // clientKey — brauzerda saqlanadigan UUID (yoki shunga o'xshash).
    // Email unik bo'lgani uchun, har bir clientKey alohida mijozga mos keladi.
    return `client-${clientKey}@minutka.local`;
  }

  async findOrCreateGuestUser(clientKey?: string): Promise<string> {
    const email = this.guestEmailForClientKey(clientKey);
    // Email уникальный — используем upsert, чтобы не делать отдельный findUnique перед create.
    const createdOrExisting = await this.prisma.user.upsert({
      where: { email },
      update: { name: 'Mehmon', role: 'CUSTOMER' },
      create: {
        email,
        name: 'Mehmon',
        // Same bcrypt hash for all guests (avoid per-request bcrypt hashing).
        password: GUEST_FIXED_BCRYPT_HASH,
        role: 'CUSTOMER',
      },
    });
    return createdOrExisting.id;
  }
}

