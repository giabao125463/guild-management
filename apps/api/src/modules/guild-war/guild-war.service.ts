import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  AuditAction,
  GameClass,
  GuildWarDay,
  GuildWarMatch,
  Prisma,
} from '@prisma/client';
import {
  GameClass as SharedGameClass,
  GuildWarDayDto,
  GuildWarMatchDto,
  GuildWarParticipantDto,
} from '@guild/shared-types';
import {
  buildPaginationMeta,
  clampPagination,
  formatDate,
  isSaturday,
  upcomingSaturdays,
} from '@guild/shared-utils';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ExcelService } from '../members/excel.service';
import {
  AddParticipantsDto,
  CreateGuildWarDayDto,
  CreateGuildWarMatchDto,
  GuildWarQueryDto,
  UpdateGuildWarDayDto,
  UpdateGuildWarMatchDto,
} from './dto/guild-war.dto';

type MatchWithRelations = GuildWarMatch & {
  mvpMember: {
    id: string;
    internalMemberId: string;
    currentName: string;
  } | null;
  participants: Array<{
    id: string;
    matchId: string;
    memberId: string;
    createdAt: Date;
    member: {
      id: string;
      internalMemberId: string;
      currentName: string;
      currentClass: GameClass;
    };
  }>;
  _count?: { participants: number };
};

@Injectable()
export class GuildWarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly excel: ExcelService,
  ) {}

  private toDayDto(
    day: GuildWarDay & {
      matches?: MatchWithRelations[];
      _count?: { matches: number };
    },
    includeMatches = false,
  ): GuildWarDayDto {
    return {
      id: day.id,
      date: formatDate(day.date)!.slice(0, 10),
      note: day.note,
      autoCreated: day.autoCreated,
      matchCount: day._count?.matches ?? day.matches?.length ?? 0,
      matches: includeMatches
        ? day.matches?.map((m) => this.toMatchDto(m, true))
        : undefined,
      createdAt: day.createdAt.toISOString(),
      updatedAt: day.updatedAt.toISOString(),
    };
  }

  private toMatchDto(
    match: MatchWithRelations,
    includeParticipants = false,
  ): GuildWarMatchDto {
    return {
      id: match.id,
      guildWarDayId: match.guildWarDayId,
      name: match.name,
      order: match.order,
      mvpMemberId: match.mvpMemberId,
      mvpMember: match.mvpMember
        ? {
            id: match.mvpMember.id,
            internalMemberId: match.mvpMember.internalMemberId,
            currentName: match.mvpMember.currentName,
          }
        : null,
      participantCount:
        match._count?.participants ?? match.participants?.length ?? 0,
      participants: includeParticipants
        ? match.participants.map((p) => this.toParticipantDto(p))
        : undefined,
      createdAt: match.createdAt.toISOString(),
      updatedAt: match.updatedAt.toISOString(),
    };
  }

  private toParticipantDto(
    p: MatchWithRelations['participants'][number],
  ): GuildWarParticipantDto {
    return {
      id: p.id,
      matchId: p.matchId,
      memberId: p.memberId,
      member: {
        id: p.member.id,
        internalMemberId: p.member.internalMemberId,
        currentName: p.member.currentName,
        currentClass: p.member.currentClass as unknown as SharedGameClass,
      },
      createdAt: p.createdAt.toISOString(),
    };
  }

  private matchInclude = {
    mvpMember: {
      select: { id: true, internalMemberId: true, currentName: true },
    },
    participants: {
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
    _count: { select: { participants: true } },
  };

  private validateSaturday(dateStr: string, allowNonSaturday?: boolean) {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date');
    }
    if (!allowNonSaturday && !isSaturday(date)) {
      throw new BadRequestException(
        'Guild war day must be a Saturday. Set allowNonSaturday to override.',
      );
    }
    return date;
  }

  private async createDayWithDefaultMatch(
    dateOnly: Date,
    options: { autoCreated?: boolean; note?: string | null } = {},
  ) {
    return this.prisma.$transaction(async (tx) => {
      const day = await tx.guildWarDay.create({
        data: {
          date: dateOnly,
          note: options.note ?? null,
          autoCreated: options.autoCreated ?? false,
        },
      });

      await tx.guildWarMatch.create({
        data: {
          guildWarDayId: day.id,
          name: 'Trận 1',
          order: 1,
        },
      });

      return tx.guildWarDay.findUniqueOrThrow({
        where: { id: day.id },
        include: { _count: { select: { matches: true } } },
      });
    });
  }

  async ensureSaturdaySchedule(weeksAhead = 4) {
    const saturdays = upcomingSaturdays(weeksAhead);
    let created = 0;
    let skipped = 0;
    const createdDates: string[] = [];

    for (const saturday of saturdays) {
      const dateOnly = new Date(saturday.toISOString().slice(0, 10));
      const existing = await this.prisma.guildWarDay.findFirst({
        where: { date: dateOnly, deletedAt: null },
      });

      if (existing) {
        skipped += 1;
        continue;
      }

      await this.createDayWithDefaultMatch(dateOnly, {
        autoCreated: true,
        note: 'Tự động tạo — mặc định 1 trận',
      });

      created += 1;
      createdDates.push(dateOnly.toISOString().slice(0, 10));
    }

    if (created > 0) {
      await this.audit.log({
        action: AuditAction.CREATE,
        module: 'guildwar',
        details: { autoSchedule: true, created, createdDates },
      });
    }

    return { created, skipped, dates: createdDates };
  }

  async createDay(
    dto: CreateGuildWarDayDto,
    actor?: { id: string; email: string },
  ) {
    const date = this.validateSaturday(dto.date, dto.allowNonSaturday);
    const dateOnly = new Date(date.toISOString().slice(0, 10));

    const existing = await this.prisma.guildWarDay.findFirst({
      where: { date: dateOnly, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException('Guild war day already exists for this date');
    }

    const day = await this.prisma.guildWarDay.create({
      data: {
        date: dateOnly,
        note: dto.note ?? null,
      },
      include: { _count: { select: { matches: true } } },
    });

    await this.audit.log({
      userId: actor?.id,
      userEmail: actor?.email,
      action: AuditAction.CREATE,
      module: 'guildwar',
      resourceId: day.id,
      details: { date: dto.date },
    });

    return this.toDayDto(day);
  }

  async findAllDays(query: GuildWarQueryDto) {
    const { page, limit, skip } = clampPagination(query.page, query.limit);
    const where: Prisma.GuildWarDayWhereInput = { deletedAt: null };

    if (query.from || query.to) {
      where.date = {};
      if (query.from) where.date.gte = new Date(query.from);
      if (query.to) where.date.lte = new Date(query.to);
    }

    const [days, total] = await Promise.all([
      this.prisma.guildWarDay.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: query.sortOrder === 'asc' ? 'asc' : 'desc' },
        include: { _count: { select: { matches: true } } },
      }),
      this.prisma.guildWarDay.count({ where }),
    ]);

    return {
      data: days.map((d) => this.toDayDto(d)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async findDay(id: string, includeMatches = true) {
    const day = await this.prisma.guildWarDay.findFirst({
      where: { id, deletedAt: null },
      include: includeMatches
        ? {
            matches: {
              where: { deletedAt: null },
              orderBy: { order: 'asc' },
              include: this.matchInclude,
            },
            _count: { select: { matches: true } },
          }
        : { _count: { select: { matches: true } } },
    });
    if (!day) throw new NotFoundException('Guild war day not found');
    return this.toDayDto(day, includeMatches);
  }

  async updateDay(
    id: string,
    dto: UpdateGuildWarDayDto,
    actor?: { id: string; email: string },
  ) {
    await this.findDay(id, false);

    const data: Prisma.GuildWarDayUpdateInput = { note: dto.note };
    if (dto.date) {
      const date = this.validateSaturday(dto.date, dto.allowNonSaturday);
      data.date = new Date(date.toISOString().slice(0, 10));
    }

    const day = await this.prisma.guildWarDay.update({
      where: { id },
      data,
      include: { _count: { select: { matches: true } } },
    });

    await this.audit.log({
      userId: actor?.id,
      userEmail: actor?.email,
      action: AuditAction.UPDATE,
      module: 'guildwar',
      resourceId: id,
      details: { changes: dto },
    });

    return this.toDayDto(day);
  }

  async removeDay(id: string, actor?: { id: string; email: string }) {
    await this.findDay(id, false);
    await this.prisma.guildWarDay.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.audit.log({
      userId: actor?.id,
      userEmail: actor?.email,
      action: AuditAction.DELETE,
      module: 'guildwar',
      resourceId: id,
    });

    return { success: true };
  }

  async createMatch(
    dayId: string,
    dto: CreateGuildWarMatchDto,
    actor?: { id: string; email: string },
  ) {
    await this.findDay(dayId, false);

    if (dto.mvpMemberId) {
      await this.ensureMemberExists(dto.mvpMemberId);
    }

    const match = await this.prisma.guildWarMatch.create({
      data: {
        guildWarDayId: dayId,
        name: dto.name,
        order: dto.order ?? 1,
        mvpMemberId: dto.mvpMemberId ?? null,
      },
      include: this.matchInclude,
    });

    await this.audit.log({
      userId: actor?.id,
      userEmail: actor?.email,
      action: AuditAction.CREATE,
      module: 'guildwar',
      resourceId: match.id,
      details: { dayId, name: dto.name },
    });

    return this.toMatchDto(match, true);
  }

  async findMatch(id: string) {
    const match = await this.prisma.guildWarMatch.findFirst({
      where: { id, deletedAt: null },
      include: this.matchInclude,
    });
    if (!match) throw new NotFoundException('Match not found');
    return this.toMatchDto(match, true);
  }

  async updateMatch(
    id: string,
    dto: UpdateGuildWarMatchDto,
    actor?: { id: string; email: string },
  ) {
    await this.findMatch(id);

    if (dto.mvpMemberId) {
      await this.ensureMemberExists(dto.mvpMemberId);
    }

    const match = await this.prisma.guildWarMatch.update({
      where: { id },
      data: {
        name: dto.name,
        order: dto.order,
        mvpMemberId: dto.mvpMemberId,
      },
      include: this.matchInclude,
    });

    await this.audit.log({
      userId: actor?.id,
      userEmail: actor?.email,
      action: AuditAction.UPDATE,
      module: 'guildwar',
      resourceId: id,
      details: { changes: dto },
    });

    return this.toMatchDto(match, true);
  }

  async removeMatch(id: string, actor?: { id: string; email: string }) {
    const match = await this.prisma.guildWarMatch.findFirst({
      where: { id, deletedAt: null },
      include: { participants: true },
    });
    if (!match) throw new NotFoundException('Match not found');

    const affectedMemberIds = match.participants.map((p) => p.memberId);

    await this.prisma.guildWarMatch.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.updateMemberAttendance(affectedMemberIds);

    await this.audit.log({
      userId: actor?.id,
      userEmail: actor?.email,
      action: AuditAction.DELETE,
      module: 'guildwar',
      resourceId: id,
    });

    return { success: true };
  }

  async addParticipants(
    matchId: string,
    dto: AddParticipantsDto,
    actor?: { id: string; email: string },
  ) {
    const match = await this.prisma.guildWarMatch.findFirst({
      where: { id: matchId, deletedAt: null },
      include: { guildWarDay: true },
    });
    if (!match) throw new NotFoundException('Match not found');

    for (const memberId of dto.memberIds) {
      await this.ensureMemberExists(memberId);
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const results = [];
      for (const memberId of dto.memberIds) {
        try {
          const participant = await tx.guildWarParticipant.create({
            data: { matchId, memberId },
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
          results.push(participant);
        } catch {
          // skip duplicates
        }
      }
      return results;
    });

    await this.recalculateAttendanceForDay(match.guildWarDayId);

    await this.audit.log({
      userId: actor?.id,
      userEmail: actor?.email,
      action: AuditAction.UPDATE,
      module: 'guildwar',
      resourceId: matchId,
      details: { added: dto.memberIds.length, created: created.length },
    });

    return created.map((p) => this.toParticipantDto(p));
  }

  async removeParticipant(
    matchId: string,
    memberId: string,
    actor?: { id: string; email: string },
  ) {
    const match = await this.prisma.guildWarMatch.findFirst({
      where: { id: matchId, deletedAt: null },
    });
    if (!match) throw new NotFoundException('Match not found');

    await this.prisma.guildWarParticipant.deleteMany({
      where: { matchId, memberId },
    });

    await this.updateMemberAttendance([memberId]);

    await this.audit.log({
      userId: actor?.id,
      userEmail: actor?.email,
      action: AuditAction.UPDATE,
      module: 'guildwar',
      resourceId: matchId,
      details: { removedMemberId: memberId },
    });

    return { success: true };
  }

  async importParticipants(
    matchId: string,
    buffer: Buffer,
    actor?: { id: string; email: string },
  ) {
    const { internalMemberIds, errors } =
      await this.excel.parseGuildWarParticipants(buffer);

    const memberIds: string[] = [];
    for (let i = 0; i < internalMemberIds.length; i++) {
      const internalId = internalMemberIds[i]!;
      const member = await this.prisma.member.findFirst({
        where: { internalMemberId: internalId, deletedAt: null },
      });
      if (!member) {
        errors.push({
          row: i + 2,
          message: `Member not found: ${internalId}`,
        });
      } else {
        memberIds.push(member.id);
      }
    }

    if (memberIds.length === 0 && errors.length > 0) {
      throw new BadRequestException({ message: 'Import failed', errors });
    }

    const added = memberIds.length
      ? await this.addParticipants(matchId, { memberIds }, actor)
      : [];

    await this.audit.log({
      userId: actor?.id,
      userEmail: actor?.email,
      action: AuditAction.IMPORT,
      module: 'guildwar',
      resourceId: matchId,
      details: { imported: memberIds.length, errors },
    });

    return { added: added.length, errors };
  }

  async buildParticipantTemplate() {
    return this.excel.buildGuildWarParticipantTemplate();
  }

  private async ensureMemberExists(memberId: string) {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, deletedAt: null },
    });
    if (!member) throw new NotFoundException(`Member ${memberId} not found`);
    return member;
  }

  private async recalculateAttendanceForDay(guildWarDayId: string) {
    const participants = await this.prisma.guildWarParticipant.findMany({
      where: {
        match: { guildWarDayId, deletedAt: null },
      },
      select: { memberId: true },
      distinct: ['memberId'],
    });

    const memberIds = participants.map((p) => p.memberId);
    await this.updateMemberAttendance(memberIds);
  }

  private async updateMemberAttendance(memberIds: string[]) {
    for (const memberId of [...new Set(memberIds)]) {
      const uniqueDays = await this.prisma.guildWarDay.count({
        where: {
          deletedAt: null,
          matches: {
            some: {
              deletedAt: null,
              participants: { some: { memberId } },
            },
          },
        },
      });

      // Contribution = số lần tham gia trận bang chiến (mỗi trận đếm 1)
      const participationCount = await this.prisma.guildWarParticipant.count({
        where: {
          memberId,
          match: { deletedAt: null },
        },
      });

      await this.prisma.member.update({
        where: { id: memberId },
        data: {
          guildWarAttendanceCount: uniqueDays,
          contributionPoint: participationCount,
        },
      });
    }
  }
}
