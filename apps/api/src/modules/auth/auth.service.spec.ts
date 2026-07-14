import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RedisService } from '../../common/redis/redis.service';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Test, TestingModule } from '@nestjs/testing';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: { findFirst: jest.Mock; update: jest.Mock; findUnique: jest.Mock };
    refreshToken: {
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('access-token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, def?: string) => {
              const map: Record<string, string> = {
                JWT_SECRET: 'test-secret',
                JWT_EXPIRES_IN: '15m',
                JWT_REFRESH_DAYS: '7',
              };
              return map[key] ?? def;
            }),
          },
        },
        {
          provide: AuditService,
          useValue: { log: jest.fn() },
        },
        {
          provide: RedisService,
          useValue: { set: jest.fn(), get: jest.fn(), del: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('rejects invalid credentials', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(
      service.login({ email: 'x@y.com', password: 'bad' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('logs in with valid credentials', async () => {
    const passwordHash = await bcrypt.hash('Admin@123456', 4);
    prisma.user.findFirst.mockResolvedValue({
      id: 'u1',
      email: 'admin@guild.local',
      name: 'Admin',
      passwordHash,
      permissions: ['member.read'],
      isActive: true,
      deletedAt: null,
    });
    prisma.user.update.mockResolvedValue({});
    prisma.refreshToken.create.mockResolvedValue({});

    const result = await service.login({
      email: 'admin@guild.local',
      password: 'Admin@123456',
    });

    expect(result.tokens.accessToken).toBe('access-token');
    expect(result.user.email).toBe('admin@guild.local');
    expect(result.tokens.refreshToken).toBeTruthy();
  });
});
