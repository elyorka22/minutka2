import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import type { User } from '../../generated/prisma/client';

export type UserEntity = User;

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

  async findById(id: string): Promise<UserEntity | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  private static readonly GUEST_EMAIL = 'guest@minutka.local';

  async findOrCreateGuestUser(): Promise<string> {
    let user = await this.findByEmail(UsersService.GUEST_EMAIL);
    if (user) return user.id;
    user = await this.create({
      email: UsersService.GUEST_EMAIL,
      name: 'Mehmon',
      password: 'guest-' + Math.random().toString(36).slice(2),
      role: 'CUSTOMER',
    });
    return user.id;
  }
}

