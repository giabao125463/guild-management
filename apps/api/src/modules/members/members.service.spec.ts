import { Test, TestingModule } from '@nestjs/testing';
import { MembersService } from './members.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ExcelService } from './excel.service';
import { NotFoundException } from '@nestjs/common';
import { GameClass } from '@prisma/client';

describe('MembersService', () => {
  let service: MembersService;
  let prisma: {
    member: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    memberTimeline: {
      findMany: jest.Mock;
      create: jest.Mock;
      createMany: jest.Mock;
    };
    memberNameHistory: { create: jest.Mock };
    memberClassHistory: { create: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      member: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      memberTimeline: {
        findMany: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
      },
      memberNameHistory: { create: jest.fn() },
      memberClassHistory: { create: jest.fn() },
      $transaction: jest.fn((fn) =>
        typeof fn === 'function' ? fn(prisma) : Promise.all(fn),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembersService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: { log: jest.fn() } },
        {
          provide: ExcelService,
          useValue: {
            buildMemberTemplate: jest.fn(),
            exportMembers: jest.fn(),
            parseMemberRows: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(MembersService);
  });

  it('throws when member not found', async () => {
    prisma.member.findFirst.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('maps member with history on findOne', async () => {
    prisma.member.findFirst.mockResolvedValue({
      id: '1',
      internalMemberId: 'M001',
      currentName: 'Test',
      currentClass: GameClass.LONG_NGAM,
      joinDate: null,
      leaveDate: null,
      isActive: true,
      isBlacklisted: false,
      relationship: null,
      realLifeRelationship: null,
      tags: ['core'],
      note: null,
      contributionPoint: 10,
      guildWarAttendanceCount: 2,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      deletedAt: null,
      historicalNames: [{ name: 'Old Name' }],
      historicalClasses: [{ gameClass: GameClass.TO_VAN }],
      userGroupAssignments: [
        {
          type: 'KIM_LANG',
          userGroup: { id: 'g1', name: 'Kim Lang Bắc', type: 'KIM_LANG' },
        },
      ],
    });

    const result = await service.findOne('1');
    expect(result.internalMemberId).toBe('M001');
    expect(result.kimLangUserGroup?.name).toBe('Kim Lang Bắc');
    expect(result.historicalNames).toContain('Old Name');
    expect(result.historicalClasses).toContain(GameClass.TO_VAN);
  });
});
