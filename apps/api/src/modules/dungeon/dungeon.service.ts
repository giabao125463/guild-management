import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  AuditAction,
  DungeonSchedule,
  DungeonStatus,
  GameClass,
  Prisma,
} from '@prisma/client';
import {
  DungeonRegistrationDto,
  DungeonScheduleDto,
  GameClass as SharedGameClass,
} from '@guild/shared-types';
import {
  buildPaginationMeta,
  clampPagination,
  formatDate,
} from '@guild/shared-utils';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateDungeonScheduleDto,
  DungeonQueryDto,
  RegisterDungeonDto,
  UpdateDungeonScheduleDto,
} from './dto/dungeon.dto';

type ScheduleWithRelations = DungeonSchedule & {
  leader: {
    id: string;
    internalMemberId: string;
    currentName: string;
  } | null;
  registrations: Array<{
    id: string;
    dungeonId: string;
    memberId: string;
    registeredAt: Date;
    cancelledAt: Date | null;
    member: {
      id: string;
      internalMemberId: string;
      currentName: string;
      currentClass: GameClass;
    };
  }>;
  _count?: { registrations: number };
};

@Injectable()
export class DungeonService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private activeRegistrationFilter = { cancelledAt: null };

  private toScheduleDto(
    schedule: ScheduleWithRelations,
    includeRegistrations = false,
  ): DungeonScheduleDto {
    const activeRegs = schedule.registrations?.filter(
      (r) => r.cancelledAt === null,
    );
    return {
      id: schedule.id,
      title: schedule.title,
      description: schedule.description,
      scheduledAt: schedule.scheduledAt.toISOString(),
      maxPlayers: schedule.maxPlayers,
      leaderId: schedule.leaderId,
      leader: schedule.leader
        ? {
            id: schedule.leader.id,
            internalMemberId: schedule.leader.internalMemberId,
            currentName: schedule.leader.currentName,
          }
        : null,
      requiredClasses:
        schedule.requiredClasses as DungeonScheduleDto['requiredClasses'],
      status: schedule.status as DungeonScheduleDto['status'],
      registeredCount:
        activeRegs?.length ?? schedule._count?.registrations ?? 0,
      registrations: includeRegistrations
        ? activeRegs?.map((r) => this.toRegistrationDto(r))
        : undefined,
      createdAt: schedule.createdAt.toISOString(),
      updatedAt: schedule.updatedAt.toISOString(),
    };
  }

  private toRegistrationDto(
    reg: ScheduleWithRelations['registrations'][number],
  ): DungeonRegistrationDto {
    return {
      id: reg.id,
      dungeonId: reg.dungeonId,
      memberId: reg.memberId,
      member: {
        id: reg.member.id,
        internalMemberId: reg.member.internalMemberId,
        currentName: reg.member.currentName,
        currentClass: reg.member.currentClass as unknown as SharedGameClass,
      },
      registeredAt: reg.registeredAt.toISOString(),
      cancelledAt: formatDate(reg.cancelledAt),
    };
  }

  private scheduleInclude = {
    leader: {
      select: { id: true, internalMemberId: true, currentName: true },
    },
    registrations: {
      where: { cancelledAt: null },
      include: {
        member: {
          select: {
            id: true,
            internalMemberId: true,
            currentName: true,
            currentClass: true,
          },
        },
      },
    },
    _count: {
      select: {
        registrations: { where: { cancelledAt: null } },
      },
    },
  };

  async create(
    dto: CreateDungeonScheduleDto,
    actor?: { id: string; email: string },
  ) {
    if (dto.leaderId) {
      await this.ensureMember(dto.leaderId);
    }

    const schedule = await this.prisma.dungeonSchedule.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        scheduledAt: new Date(dto.scheduledAt),
        maxPlayers: dto.maxPlayers,
        leaderId: dto.leaderId ?? null,
        requiredClasses: dto.requiredClasses ?? [],
        status: DungeonStatus.OPEN,
      },
      include: this.scheduleInclude,
    });

    await this.audit.log({
      userId: actor?.id,
      userEmail: actor?.email,
      action: AuditAction.CREATE,
      module: 'dungeon',
      resourceId: schedule.id,
      details: { title: dto.title },
    });

    return this.toScheduleDto(schedule, true);
  }

  async findAll(query: DungeonQueryDto) {
    const { page, limit, skip } = clampPagination(query.page, query.limit);
    const where: Prisma.DungeonScheduleWhereInput = { deletedAt: null };

    if (query.status) where.status = query.status;
    if (query.from || query.to) {
      where.scheduledAt = {};
      if (query.from) where.scheduledAt.gte = new Date(query.from);
      if (query.to) where.scheduledAt.lte = new Date(query.to);
    }
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [schedules, total] = await Promise.all([
      this.prisma.dungeonSchedule.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          scheduledAt: query.sortOrder === 'asc' ? 'asc' : 'desc',
        },
        include: this.scheduleInclude,
      }),
      this.prisma.dungeonSchedule.count({ where }),
    ]);

    return {
      data: schedules.map((s) => this.toScheduleDto(s)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async findOne(id: string) {
    const schedule = await this.prisma.dungeonSchedule.findFirst({
      where: { id, deletedAt: null },
      include: this.scheduleInclude,
    });
    if (!schedule) throw new NotFoundException('Dungeon schedule not found');
    return this.toScheduleDto(schedule, true);
  }

  async update(
    id: string,
    dto: UpdateDungeonScheduleDto,
    actor?: { id: string; email: string },
  ) {
    await this.findOne(id);
    if (dto.leaderId) await this.ensureMember(dto.leaderId);

    const schedule = await this.prisma.dungeonSchedule.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        maxPlayers: dto.maxPlayers,
        leaderId: dto.leaderId,
        requiredClasses: dto.requiredClasses,
        status: dto.status,
      },
      include: this.scheduleInclude,
    });

    await this.audit.log({
      userId: actor?.id,
      userEmail: actor?.email,
      action: AuditAction.UPDATE,
      module: 'dungeon',
      resourceId: id,
      details: { changes: dto },
    });

    return this.toScheduleDto(schedule, true);
  }

  async remove(id: string, actor?: { id: string; email: string }) {
    await this.findOne(id);
    await this.prisma.dungeonSchedule.update({
      where: { id },
      data: { deletedAt: new Date(), status: DungeonStatus.CANCELLED },
    });

    await this.audit.log({
      userId: actor?.id,
      userEmail: actor?.email,
      action: AuditAction.DELETE,
      module: 'dungeon',
      resourceId: id,
    });

    return { success: true };
  }

  async register(
    id: string,
    dto: RegisterDungeonDto,
    actor?: { id: string; email: string },
  ) {
    const schedule = await this.prisma.dungeonSchedule.findFirst({
      where: { id, deletedAt: null },
      include: {
        registrations: { where: this.activeRegistrationFilter },
      },
    });
    if (!schedule) throw new NotFoundException('Dungeon schedule not found');

    if (
      schedule.status !== DungeonStatus.OPEN &&
      schedule.status !== DungeonStatus.FULL
    ) {
      throw new BadRequestException('Registration is not open');
    }

    const member = await this.ensureMember(dto.memberId);

    if (schedule.requiredClasses.length > 0) {
      if (!schedule.requiredClasses.includes(member.currentClass)) {
        throw new BadRequestException(
          `Member class ${member.currentClass} not in required classes`,
        );
      }
    }

    const activeCount = schedule.registrations.length;
    if (activeCount >= schedule.maxPlayers) {
      throw new BadRequestException('Dungeon is full');
    }

    const existing = await this.prisma.dungeonRegistration.findUnique({
      where: {
        dungeonId_memberId: { dungeonId: id, memberId: dto.memberId },
      },
    });

    if (existing && !existing.cancelledAt) {
      throw new ConflictException('Member already registered');
    }

    const registration = existing
      ? await this.prisma.dungeonRegistration.update({
          where: { id: existing.id },
          data: { cancelledAt: null, registeredAt: new Date() },
          include: {
            member: {
              select: {
                id: true,
                internalMemberId: true,
                currentName: true,
                currentClass: true,
              },
            },
          },
        })
      : await this.prisma.dungeonRegistration.create({
          data: { dungeonId: id, memberId: dto.memberId },
          include: {
            member: {
              select: {
                id: true,
                internalMemberId: true,
                currentName: true,
                currentClass: true,
              },
            },
          },
        });

    await this.syncFullStatus(id);

    await this.audit.log({
      userId: actor?.id,
      userEmail: actor?.email,
      action: AuditAction.REGISTER,
      module: 'dungeon',
      resourceId: id,
      details: { memberId: dto.memberId },
    });

    return this.toRegistrationDto(registration);
  }

  async cancelRegistration(
    id: string,
    memberId: string,
    actor?: { id: string; email: string },
  ) {
    const registration = await this.prisma.dungeonRegistration.findUnique({
      where: { dungeonId_memberId: { dungeonId: id, memberId } },
    });
    if (!registration || registration.cancelledAt) {
      throw new NotFoundException('Registration not found');
    }

    await this.prisma.dungeonRegistration.update({
      where: { id: registration.id },
      data: { cancelledAt: new Date() },
    });

    await this.syncFullStatus(id);

    await this.audit.log({
      userId: actor?.id,
      userEmail: actor?.email,
      action: AuditAction.CANCEL_REGISTRATION,
      module: 'dungeon',
      resourceId: id,
      details: { memberId },
    });

    return { success: true };
  }

  async getStatistics() {
    const [
      totalSchedules,
      byStatus,
      totalRegistrations,
      uniqueMembers,
      topLeaders,
      topMembers,
    ] = await Promise.all([
      this.prisma.dungeonSchedule.count({ where: { deletedAt: null } }),
      this.prisma.dungeonSchedule.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.dungeonRegistration.count({
        where: { cancelledAt: null, dungeon: { deletedAt: null } },
      }),
      this.prisma.dungeonRegistration.findMany({
        where: { cancelledAt: null, dungeon: { deletedAt: null } },
        select: { memberId: true },
        distinct: ['memberId'],
      }),
      this.prisma.dungeonSchedule.groupBy({
        by: ['leaderId'],
        where: { deletedAt: null, leaderId: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { leaderId: 'desc' } },
        take: 10,
      }),
      this.prisma.dungeonRegistration.groupBy({
        by: ['memberId'],
        where: { cancelledAt: null, dungeon: { deletedAt: null } },
        _count: { _all: true },
        orderBy: { _count: { memberId: 'desc' } },
        take: 10,
      }),
    ]);

    const leaderIds = topLeaders
      .map((l) => l.leaderId)
      .filter((id): id is string => Boolean(id));
    const memberIds = topMembers.map((m) => m.memberId);

    const members = await this.prisma.member.findMany({
      where: { id: { in: [...leaderIds, ...memberIds] } },
      select: { id: true, internalMemberId: true, currentName: true },
    });
    const memberMap = new Map(members.map((m) => [m.id, m]));

    return {
      totalSchedules,
      totalRegistrations,
      uniqueParticipants: uniqueMembers.length,
      byStatus: byStatus.map((s) => ({
        status: s.status,
        count: s._count._all,
      })),
      topLeaders: topLeaders.map((l) => {
        const member = memberMap.get(l.leaderId!);
        return {
          memberId: l.leaderId!,
          internalMemberId: member?.internalMemberId ?? '',
          name: member?.currentName ?? 'Unknown',
          count: l._count._all,
        };
      }),
      topMembers: topMembers.map((m) => {
        const member = memberMap.get(m.memberId);
        return {
          memberId: m.memberId,
          internalMemberId: member?.internalMemberId ?? '',
          name: member?.currentName ?? 'Unknown',
          count: m._count._all,
        };
      }),
    };
  }

  private async syncFullStatus(dungeonId: string) {
    const schedule = await this.prisma.dungeonSchedule.findUnique({
      where: { id: dungeonId },
      include: {
        registrations: { where: this.activeRegistrationFilter },
      },
    });
    if (!schedule || schedule.status === DungeonStatus.CANCELLED) return;

    const count = schedule.registrations.length;
    let status = schedule.status;

    if (count >= schedule.maxPlayers) {
      status = DungeonStatus.FULL;
    } else if (schedule.status === DungeonStatus.FULL) {
      status = DungeonStatus.OPEN;
    }

    if (status !== schedule.status) {
      await this.prisma.dungeonSchedule.update({
        where: { id: dungeonId },
        data: { status },
      });
    }
  }

  private async ensureMember(memberId: string) {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, deletedAt: null, isActive: true },
    });
    if (!member) throw new NotFoundException('Member not found or inactive');
    return member;
  }
}
