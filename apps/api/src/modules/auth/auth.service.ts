import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RedisService } from '../../common/redis/redis.service';
import { LoginDto } from './dto/auth.dto';
import { JwtPayload } from './jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly redis: RedisService,
  ) {}

  async login(
    dto: LoginDto,
    meta?: { ipAddress?: string; userAgent?: string },
  ) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase(), deletedAt: null },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Sai email hoặc mật khẩu');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Sai email hoặc mật khẩu');
    }

    const rememberMe = Boolean(dto.rememberMe);
    const tokens = await this.issueTokens(
      user.id,
      user.email,
      user.permissions,
      rememberMe,
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.audit.log({
      userId: user.id,
      userEmail: user.email,
      action: AuditAction.LOGIN,
      module: 'auth',
      resourceId: user.id,
      details: { rememberMe },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        permissions: user.permissions,
        isActive: user.isActive,
      },
      tokens,
    };
  }

  async refresh(refreshToken: string) {
    const hashed = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: {
        token: hashed,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!stored || !stored.user.isActive || stored.user.deletedAt) {
      throw new UnauthorizedException('Phiên đăng nhập hết hạn');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(
      stored.user.id,
      stored.user.email,
      stored.user.permissions,
      stored.rememberMe,
    );
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      const hashed = this.hashToken(refreshToken);
      await this.prisma.refreshToken.updateMany({
        where: { userId, token: hashed, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } else {
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    await this.audit.log({
      userId,
      userEmail: user?.email,
      action: AuditAction.LOGOUT,
      module: 'auth',
      resourceId: userId,
    });

    return { success: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) throw new UnauthorizedException();
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      permissions: user.permissions,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
    };
  }

  private async issueTokens(
    userId: string,
    email: string,
    permissions: string[],
    rememberMe = false,
  ) {
    const payload: JwtPayload = { sub: userId, email, permissions };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('JWT_SECRET', 'dev-jwt-secret-change-me'),
      expiresIn: this.config.get('JWT_EXPIRES_IN', '15m') as `${number}m`,
    });

    const refreshToken = randomBytes(48).toString('hex');
    const defaultDays = Number(this.config.get('JWT_REFRESH_DAYS', 7));
    const rememberDays = Number(this.config.get('JWT_REFRESH_DAYS_REMEMBER', 90));
    const refreshDays = rememberMe ? rememberDays : defaultDays;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshDays);

    await this.prisma.refreshToken.create({
      data: {
        token: this.hashToken(refreshToken),
        userId,
        expiresAt,
        rememberMe,
      },
    });

    await this.redis.set(
      `refresh:${userId}:${this.hashToken(refreshToken).slice(0, 16)}`,
      rememberMe ? 'remember' : '1',
      refreshDays * 24 * 60 * 60,
    );

    return { accessToken, refreshToken };
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  async hashPassword(password: string) {
    if (password.length < 6) {
      throw new BadRequestException('Mật khẩu tối thiểu 6 ký tự');
    }
    return bcrypt.hash(password, 12);
  }
}
