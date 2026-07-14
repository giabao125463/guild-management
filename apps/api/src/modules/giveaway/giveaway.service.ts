import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  AuditAction,
  Giveaway,
  GiveawayFilterType,
  GiveawayWinner,
  Prisma,
} from '@prisma/client';
import {
  GiveawayCandidateDto,
  GiveawayDto,
  GiveawayWinnerDto,
} from '@guild/shared-types';
import {
  buildPaginationMeta,
  clampPagination,
  secureRandomIndex,
} from '@guild/shared-utils';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ExcelService } from '../members/excel.service';
import { GenerateCandidatesDto, GiveawayQueryDto } from './dto/giveaway.dto';

type WinnerWithMember = GiveawayWinner & {
  member: {
    id: string;
    internalMemberId: string;
    currentName: string;
  };
};

type GiveawayWithRelations = Giveaway & {
  winnerMember?: {
    id: string;
    internalMemberId: string;
    currentName: string;
  } | null;
  winners?: WinnerWithMember[];
};

@Injectable()
export class GiveawayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly excel: ExcelService,
  ) {}

  private toWinnerDto(winner: WinnerWithMember): GiveawayWinnerDto {
    return {
      id: winner.id,
      giveawayId: winner.giveawayId,
      memberId: winner.memberId,
      order: winner.order,
      spunAt: winner.spunAt.toISOString(),
      spunBy: winner.spunBy,
      member: {
        id: winner.member.id,
        internalMemberId: winner.member.internalMemberId,
        currentName: winner.member.currentName,
      },
    };
  }

  private async toDto(
    giveaway: GiveawayWithRelations,
  ): Promise<GiveawayDto> {
    const winners = (giveaway.winners ?? []).map((w) => this.toWinnerDto(w));
    const winnerIds = new Set(winners.map((w) => w.memberId));
    const remaining = giveaway.candidateIds.filter((id) => !winnerIds.has(id));

    const members = giveaway.candidateIds.length
      ? await this.prisma.member.findMany({
          where: { id: { in: giveaway.candidateIds } },
          select: { id: true, internalMemberId: true, currentName: true },
        })
      : [];

    const memberMap = new Map(members.map((m) => [m.id, m]));
    const candidates: GiveawayCandidateDto[] = giveaway.candidateIds
      .map((id) => memberMap.get(id))
      .filter((m): m is NonNullable<typeof m> => Boolean(m))
      .map((m) => ({
        id: m.id,
        internalMemberId: m.internalMemberId,
        currentName: m.currentName,
      }));

    return {
      id: giveaway.id,
      guildWarDayId: giveaway.guildWarDayId,
      filterType: giveaway.filterType as GiveawayDto['filterType'],
      customFilter: giveaway.customFilter as Record<string, unknown> | null,
      candidateIds: giveaway.candidateIds,
      candidates,
      candidateCount: giveaway.candidateCount,
      remainingCandidateCount: remaining.length,
      winnerMemberId: giveaway.winnerMemberId,
      winnerMember: giveaway.winnerMember
        ? {
            id: giveaway.winnerMember.id,
            internalMemberId: giveaway.winnerMember.internalMemberId,
            currentName: giveaway.winnerMember.currentName,
          }
        : null,
      winners,
      spunAt: giveaway.spunAt?.toISOString() ?? null,
      spunBy: giveaway.spunBy,
      createdAt: giveaway.createdAt.toISOString(),
    };
  }

  private winnerInclude = {
    winnerMember: {
      select: { id: true, internalMemberId: true, currentName: true },
    },
    winners: {
      orderBy: { order: 'asc' as const },
      include: {
        member: {
          select: { id: true, internalMemberId: true, currentName: true },
        },
      },
    },
  };

  async generateCandidates(
    guildWarDayId: string,
    dto: GenerateCandidatesDto,
    actor?: { id: string; email: string },
  ) {
    const day = await this.prisma.guildWarDay.findFirst({
      where: { id: guildWarDayId, deletedAt: null },
    });
    if (!day) throw new NotFoundException('Không tìm thấy ngày bang chiến');

    const candidateIds = await this.resolveCandidates(day.id, dto);

    const giveaway = await this.prisma.giveaway.create({
      data: {
        guildWarDayId,
        filterType: dto.filterType,
        customFilter:
          dto.filterType === GiveawayFilterType.CUSTOM
            ? ({
                memberIds: dto.memberIds ?? [],
                internalMemberIds: dto.internalMemberIds ?? [],
              } as Prisma.InputJsonValue)
            : undefined,
        candidateIds,
        candidateCount: candidateIds.length,
      },
      include: this.winnerInclude,
    });

    await this.audit.log({
      userId: actor?.id,
      userEmail: actor?.email,
      action: AuditAction.CREATE,
      module: 'giveaway',
      resourceId: giveaway.id,
      details: {
        filterType: dto.filterType,
        candidateCount: candidateIds.length,
      },
    });

    return this.toDto(giveaway);
  }

  async generateFromExcel(
    guildWarDayId: string,
    buffer: Buffer,
    actor?: { id: string; email: string },
  ) {
    const { names, internalMemberIds, errors } =
      await this.excel.parseGuildWarParticipants(buffer);

    const resolvedMemberIds: string[] = [];

    for (const name of names) {
      const members = await this.prisma.member.findMany({
        where: {
          deletedAt: null,
          currentName: { equals: name, mode: 'insensitive' },
        },
        select: { id: true },
      });
      if (members.length === 1) {
        resolvedMemberIds.push(members[0]!.id);
      }
    }

    for (const internalId of internalMemberIds) {
      const member = await this.prisma.member.findFirst({
        where: { internalMemberId: internalId, deletedAt: null },
        select: { id: true },
      });
      if (member) resolvedMemberIds.push(member.id);
    }

    const memberIds = [...new Set(resolvedMemberIds)];

    if (memberIds.length === 0) {
      throw new BadRequestException({
        message: 'File Excel không có thành viên hợp lệ',
        errors,
      });
    }

    return this.generateCandidates(
      guildWarDayId,
      {
        filterType: GiveawayFilterType.CUSTOM,
        memberIds,
      },
      actor,
    );
  }

  async buildCandidateTemplate() {
    return this.excel.buildGuildWarParticipantTemplate();
  }

  async spin(giveawayId: string, actor: { id: string; email: string }) {
    const giveaway = await this.prisma.giveaway.findUnique({
      where: { id: giveawayId },
      include: { winners: true },
    });
    if (!giveaway) throw new NotFoundException('Không tìm thấy vòng quay');

    const winnerIds = new Set(giveaway.winners.map((w) => w.memberId));
    const remaining = giveaway.candidateIds.filter((id) => !winnerIds.has(id));

    if (remaining.length === 0) {
      throw new BadRequestException(
        'Đã hết ứng viên hoặc đã quay hết tất cả giải',
      );
    }

    const index = secureRandomIndex(remaining.length);
    const winnerMemberId = remaining[index]!;
    const order = giveaway.winners.length + 1;
    const spunAt = new Date();

    await this.prisma.giveawayWinner.create({
      data: {
        giveawayId,
        memberId: winnerMemberId,
        order,
        spunAt,
        spunBy: actor.id,
      },
    });

    const updated = await this.prisma.giveaway.update({
      where: { id: giveawayId },
      data: {
        winnerMemberId,
        spunAt,
        spunBy: actor.id,
      },
      include: this.winnerInclude,
    });

    await this.audit.log({
      userId: actor.id,
      userEmail: actor.email,
      action: AuditAction.SPIN_GIVEAWAY,
      module: 'giveaway',
      resourceId: giveawayId,
      details: { winnerMemberId, order },
    });

    return this.toDto(updated);
  }

  async removeCandidates(
    giveawayId: string,
    memberIds: string[],
    actor?: { id: string; email: string },
  ) {
    const giveaway = await this.prisma.giveaway.findUnique({
      where: { id: giveawayId },
      include: { winners: true },
    });
    if (!giveaway) throw new NotFoundException('Không tìm thấy vòng quay');

    const winnerIds = new Set(giveaway.winners.map((w) => w.memberId));
    const toRemove = [...new Set(memberIds)];

    const invalid = toRemove.filter((id) => !giveaway.candidateIds.includes(id));
    if (invalid.length > 0) {
      throw new BadRequestException(
        'Một số thành viên không có trong vòng quay này',
      );
    }

    const blocked = toRemove.filter((id) => winnerIds.has(id));
    if (blocked.length > 0) {
      throw new BadRequestException(
        'Không thể loại thành viên đã trúng giải',
      );
    }

    const removeSet = new Set(toRemove);
    const nextCandidateIds = giveaway.candidateIds.filter(
      (id) => !removeSet.has(id),
    );

    const updated = await this.prisma.giveaway.update({
      where: { id: giveawayId },
      data: {
        candidateIds: nextCandidateIds,
        candidateCount: nextCandidateIds.length,
      },
      include: this.winnerInclude,
    });

    await this.audit.log({
      userId: actor?.id,
      userEmail: actor?.email,
      action: AuditAction.UPDATE,
      module: 'giveaway',
      resourceId: giveawayId,
      details: { removedMemberIds: toRemove, remaining: nextCandidateIds.length },
    });

    return this.toDto(updated);
  }

  async findAll(query: GiveawayQueryDto) {
    const { page, limit, skip } = clampPagination(query.page, query.limit);
    const where: Prisma.GiveawayWhereInput = {};
    if (query.guildWarDayId) where.guildWarDayId = query.guildWarDayId;

    const [giveaways, total] = await Promise.all([
      this.prisma.giveaway.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: query.sortOrder === 'asc' ? 'asc' : 'desc' },
        include: this.winnerInclude,
      }),
      this.prisma.giveaway.count({ where }),
    ]);

    return {
      data: await Promise.all(giveaways.map((g) => this.toDto(g))),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async findOne(id: string) {
    const giveaway = await this.prisma.giveaway.findUnique({
      where: { id },
      include: this.winnerInclude,
    });
    if (!giveaway) throw new NotFoundException('Không tìm thấy vòng quay');
    return this.toDto(giveaway);
  }

  async listAllWinners(query: GiveawayQueryDto) {
    const { page, limit, skip } = clampPagination(query.page, query.limit);
    const where: Prisma.GiveawayWinnerWhereInput = {};
    if (query.giveawayId) where.giveawayId = query.giveawayId;
    if (query.guildWarDayId) {
      where.giveaway = { guildWarDayId: query.guildWarDayId };
    }

    const [rows, total] = await Promise.all([
      this.prisma.giveawayWinner.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ order: 'asc' }, { spunAt: 'asc' }],
        include: {
          member: {
            select: { id: true, internalMemberId: true, currentName: true },
          },
          giveaway: {
            select: { id: true, guildWarDayId: true, filterType: true },
          },
        },
      }),
      this.prisma.giveawayWinner.count({ where }),
    ]);

    return {
      data: rows.map((w) => ({
        ...this.toWinnerDto(w as WinnerWithMember),
        guildWarDayId: w.giveaway.guildWarDayId,
        filterType: w.giveaway.filterType,
      })),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  private async resolveCandidates(
    guildWarDayId: string,
    dto: GenerateCandidatesDto,
  ): Promise<string[]> {
    const day = await this.prisma.guildWarDay.findUnique({
      where: { id: guildWarDayId },
      include: {
        matches: {
          where: { deletedAt: null },
          include: { participants: true },
        },
      },
    });
    if (!day) throw new NotFoundException('Không tìm thấy ngày bang chiến');

    const matches = day.matches;

    switch (dto.filterType) {
      case GiveawayFilterType.ALL_MATCHES_TODAY: {
        if (matches.length === 0) {
          throw new BadRequestException('Ngày này chưa có trận đấu');
        }
        const matchIds = matches.map((m) => m.id);
        const participation = new Map<string, Set<string>>();

        for (const match of matches) {
          for (const p of match.participants) {
            if (!participation.has(p.memberId)) {
              participation.set(p.memberId, new Set());
            }
            participation.get(p.memberId)!.add(match.id);
          }
        }

        return [...participation.entries()]
          .filter(([, matchSet]) => matchIds.every((id) => matchSet.has(id)))
          .map(([memberId]) => memberId);
      }

      case GiveawayFilterType.MVP_TODAY: {
        if (matches.length === 0) {
          throw new BadRequestException('Ngày này chưa có trận đấu');
        }
        const mvpIds = matches
          .map((m) => m.mvpMemberId)
          .filter((id): id is string => Boolean(id));
        return [...new Set(mvpIds)];
      }

      case GiveawayFilterType.CUSTOM: {
        const ids = new Set<string>();

        if (dto.memberIds?.length) {
          const byId = await this.prisma.member.findMany({
            where: { id: { in: dto.memberIds }, deletedAt: null },
            select: { id: true },
          });
          byId.forEach((m) => ids.add(m.id));
        }

        if (dto.internalMemberIds?.length) {
          const byInternal = await this.prisma.member.findMany({
            where: {
              internalMemberId: { in: dto.internalMemberIds },
              deletedAt: null,
            },
            select: { id: true },
          });
          byInternal.forEach((m) => ids.add(m.id));
        }

        if (ids.size === 0) {
          throw new BadRequestException(
            'Không tìm thấy thành viên hợp lệ cho bộ lọc tùy chỉnh',
          );
        }

        return [...ids];
      }

      default:
        return [];
    }
  }
}
