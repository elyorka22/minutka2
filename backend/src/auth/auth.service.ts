import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { UsersService, UserEntity } from '../users/users.service';

interface JwtPayload {
  sub: string;
  role: string;
}

@Injectable()
export class AuthService {
  private accessTokenTtlSeconds = 60 * 15;

  constructor(private readonly usersService: UsersService) {}

  private getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not set');
    }
    return secret;
  }

  async validateUser(email: string, password: string): Promise<UserEntity> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async login(user: UserEntity) {
    const payload: JwtPayload = { sub: user.id, role: user.role };

    const token = jwt.sign(payload, this.getJwtSecret(), {
      expiresIn: this.accessTokenTtlSeconds,
    });

    return {
      accessToken: token,
    };
  }

  verifyToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, this.getJwtSecret()) as JwtPayload;
      return decoded;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}

