import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { UsersService, UserEntity } from '../users/users.service';
import { PrismaService } from '../prisma.service';

interface JwtPayload {
  sub: string;
  role: string;
}

@Injectable()
export class AuthService {
  private defaultAccessTokenTtlSeconds = 60 * 15; // 15 min
  private defaultRefreshTokenTtlSeconds = 60 * 60 * 24 * 30; // 30 days

  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
  ) {}

  private getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not set');
    }
    return secret;
  }

  async validateUser(email: string, password: string): Promise<UserEntity> {
    const user = await this.usersService.findByEmailIgnoreCase(email);
    if (!user) {
      throw new UnauthorizedException('Login yoki parol noto‘g‘ri');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Login yoki parol noto‘g‘ri');
    }

    return user;
  }

  private getAccessTokenTtlSeconds(): number {
    const raw = Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? this.defaultAccessTokenTtlSeconds);
    if (!Number.isFinite(raw)) return this.defaultAccessTokenTtlSeconds;
    return Math.min(Math.max(Math.floor(raw), 60), 60 * 60 * 24);
  }

  private getRefreshTokenTtlSeconds(): number {
    const raw = Number(process.env.REFRESH_TOKEN_TTL_SECONDS ?? this.defaultRefreshTokenTtlSeconds);
    if (!Number.isFinite(raw)) return this.defaultRefreshTokenTtlSeconds;
    return Math.min(Math.max(Math.floor(raw), 60 * 60), 60 * 60 * 24 * 90);
  }

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private generateRefreshToken(): string {
    return randomBytes(48).toString('hex');
  }

  private generateRecordId(): string {
    return randomBytes(16).toString('hex');
  }

  private async saveRefreshToken(userId: string, refreshToken: string, expiresAt: Date): Promise<void> {
    const tokenHash = this.hashRefreshToken(refreshToken);
    const id = this.generateRecordId();
    await this.prisma.$executeRaw`
      INSERT INTO "RefreshToken" ("id", "createdAt", "updatedAt", "tokenHash", "expiresAt", "userId")
      VALUES (${id}, NOW(), NOW(), ${tokenHash}, ${expiresAt}, ${userId})
    `;
  }

  private async revokeRefreshToken(refreshToken: string): Promise<void> {
    const tokenHash = this.hashRefreshToken(refreshToken);
    await this.prisma.$executeRaw`
      UPDATE "RefreshToken"
      SET "revokedAt" = NOW(), "updatedAt" = NOW()
      WHERE "tokenHash" = ${tokenHash} AND "revokedAt" IS NULL
    `;
  }

  private async issueTokenPair(user: UserEntity) {
    const payload: JwtPayload = { sub: user.id, role: user.role };
    const accessTokenExpiresIn = this.getAccessTokenTtlSeconds();

    const accessToken = jwt.sign(payload, this.getJwtSecret(), {
      expiresIn: accessTokenExpiresIn,
    });
    const refreshToken = this.generateRefreshToken();
    const refreshTokenExpiresIn = this.getRefreshTokenTtlSeconds();
    const expiresAt = new Date(Date.now() + refreshTokenExpiresIn * 1000);
    await this.saveRefreshToken(user.id, refreshToken, expiresAt);

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresIn,
      refreshTokenExpiresIn,
    };
  }

  async login(user: UserEntity) {
    return this.issueTokenPair(user);
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hashRefreshToken(refreshToken);
    const rows = (await this.prisma.$queryRaw<
      Array<{ id: string; userId: string; expiresAt: Date; revokedAt: Date | null }>
    >`
      SELECT "id", "userId", "expiresAt", "revokedAt"
      FROM "RefreshToken"
      WHERE "tokenHash" = ${tokenHash}
      LIMIT 1
    `) ?? [];
    const found = rows[0];
    if (!found || found.revokedAt || found.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersService.findById(found.userId);
    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.revokeRefreshToken(refreshToken);
    return this.issueTokenPair(user);
  }

  async logout(refreshToken: string) {
    await this.revokeRefreshToken(refreshToken);
    return { ok: true };
  }

  verifyToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, this.getJwtSecret()) as JwtPayload;
      return decoded;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private async revokeAllRefreshTokensForUser(userId: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE "RefreshToken"
      SET "revokedAt" = NOW(), "updatedAt" = NOW()
      WHERE "userId" = ${userId} AND "revokedAt" IS NULL
    `;
  }

  /**
   * Joriy parolni tekshiradi, ixtiyoriy yangi email va/yoki parolni saqlaydi.
   * Mehmon (@minutka.local) akkauntlari uchun ruxsat yo‘q.
   */
  async updateMyCredentials(
    userId: string,
    dto: { currentPassword: string; newPassword?: string; newEmail?: string },
  ): Promise<{ ok: true; email: string }> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }
    if (user.email.endsWith('@minutka.local')) {
      throw new ForbiddenException('Bu akkaunt uchun login yoki parolni o‘zgartirib bo‘lmaydi');
    }

    const currentOk = await bcrypt.compare(dto.currentPassword, user.password);
    if (!currentOk) {
      throw new UnauthorizedException('Joriy parol noto‘g‘ri');
    }

    const rawEmail = dto.newEmail?.trim();
    const rawPassword = dto.newPassword?.trim();
    const nextEmail = rawEmail && rawEmail.length > 0 ? rawEmail : undefined;
    const nextPassword = rawPassword && rawPassword.length > 0 ? rawPassword : undefined;

    if (!nextEmail && !nextPassword) {
      throw new BadRequestException('Yangi email yoki yangi parol kerak');
    }

    if (nextEmail) {
      const taken = await this.usersService.findByEmailIgnoreCase(nextEmail);
      if (taken && taken.id !== userId) {
        throw new ConflictException('Bu email allaqachon band');
      }
    }

    const data: { email?: string; password?: string } = {};
    if (nextEmail) data.email = nextEmail;
    if (nextPassword) data.password = await bcrypt.hash(nextPassword, 10);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: { email: true },
    });

    await this.revokeAllRefreshTokensForUser(userId);

    return { ok: true, email: updated.email };
  }
}

