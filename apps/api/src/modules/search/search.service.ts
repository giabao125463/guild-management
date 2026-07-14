import { Injectable } from '@nestjs/common';
import { GameClass, Prisma, UserGroupType } from '@prisma/client';
import {
  GlobalSearchResult,
  MemberDto,
  MemberUserGroupRef,
  UserGroupType as SharedUserGroupType,
} from '@guild/shared-types';
import {
  clampPagination,
  formatDate,
  parseGameClass,
} from '@guild/shared-utils';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async globalSearch(
    search: string,
    page?: number,
    limit?: number,
  ): Promise<GlobalSearchResult> {
    const { limit: safeLimit, skip } = clampPagination(page, limit);

    const term = search.trim();
    if (!term) {
      return { members: [], total: 0 };
    }

    const or: Prisma.MemberWhereInput[] = [
      { currentName: { contains: term, mode: 'insensitive' } },
      { internalMemberId: { contains: term, mode: 'insensitive' } },
      { relationship: { contains: term, mode: 'insensitive' } },
      { realLifeRelationship: { contains: term, mode: 'insensitive' } },
      { note: { contains: term, mode: 'insensitive' } },
      { tags: { hasSome: [term] } },
      {
        userGroupAssignments: {
          some: {
            userGroup: {
              name: { contains: term, mode: 'insensitive' },
            },
          },
        },
      },
      {
        historicalNames: {
          some: { name: { contains: term, mode: 'insensitive' } },
        },
      },
    ];

    const parsedClass = parseGameClass(term);
    if (parsedClass) {
      const gameClass = parsedClass as unknown as GameClass;
      or.push({ currentClass: gameClass });
      or.push({
        historicalClasses: {
          some: { gameClass },
        },
      });
    }

    const where: Prisma.MemberWhereInput = {
      deletedAt: null,
      OR: or,
    };

    const [members, total] = await Promise.all([
      this.prisma.member.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: { currentName: 'asc' },
        include: {
          historicalNames: { orderBy: { changedAt: 'desc' } },
          historicalClasses: { orderBy: { changedAt: 'desc' } },
          userGroupAssignments: {
            include: {
              userGroup: { select: { id: true, name: true, type: true } },
            },
          },
        },
      }),
      this.prisma.member.count({ where }),
    ]);

    return {
      members: members.map((m) => this.toMemberDto(m)),
      total,
    };
  }

  private toMemberDto(member: {
    id: string;
    internalMemberId: string;
    currentName: string;
    currentClass: GameClass;
    joinDate: Date | null;
    leaveDate: Date | null;
    isActive: boolean;
    isBlacklisted: boolean;
    relationship: string | null;
    realLifeRelationship: string | null;
    tags: string[];
    note: string | null;
    contributionPoint: number;
    guildWarAttendanceCount: number;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    historicalNames: { name: string }[];
    historicalClasses: { gameClass: GameClass }[];
    userGroupAssignments: {
      type: UserGroupType;
      userGroup: { id: string; name: string; type: UserGroupType };
    }[];
  }): MemberDto {
    const userGroups: Partial<Record<SharedUserGroupType, MemberUserGroupRef>> =
      {};
    for (const assignment of member.userGroupAssignments) {
      userGroups[assignment.type as SharedUserGroupType] = {
        id: assignment.userGroup.id,
        name: assignment.userGroup.name,
        type: assignment.type as SharedUserGroupType,
      };
    }

    return {
      id: member.id,
      internalMemberId: member.internalMemberId,
      currentName: member.currentName,
      currentClass: member.currentClass as MemberDto['currentClass'],
      joinDate: formatDate(member.joinDate),
      leaveDate: formatDate(member.leaveDate),
      isActive: member.isActive,
      isBlacklisted: member.isBlacklisted,
      relationship: member.relationship,
      realLifeRelationship: member.realLifeRelationship,
      tags: member.tags,
      note: member.note,
      contributionPoint: member.contributionPoint,
      guildWarAttendanceCount: member.guildWarAttendanceCount,
      userGroups,
      kimLangUserGroup: userGroups[SharedUserGroupType.KIM_LANG] ?? null,
      historicalNames: member.historicalNames.map((h) => h.name),
      historicalClasses: member.historicalClasses.map(
        (h) => h.gameClass as MemberDto['currentClass'],
      ),
      createdAt: member.createdAt.toISOString(),
      updatedAt: member.updatedAt.toISOString(),
      deletedAt: formatDate(member.deletedAt),
    };
  }
}
