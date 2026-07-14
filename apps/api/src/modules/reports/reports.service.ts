import { Injectable } from '@nestjs/common';
import {
  DashboardStats,
  GameClass,
  GAME_CLASS_LABELS,
  GAME_CLASSES,
  UserGroupType,
} from '@guild/shared-types';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats(): Promise<DashboardStats> {
    const [
      totalMembers,
      activeMembers,
      inactiveMembers,
      blacklistedMembers,
      classGroups,
      totalWarDays,
      totalMatches,
      attendanceRanking,
      topMvp,
      totalSpins,
      topWinners,
      totalSchedules,
      topLeaders,
      topDungeonMembers,
      contributionRanking,
      userGroupTotals,
      userGroupActiveTotals,
      userGroups,
    ] = await Promise.all([
      this.prisma.member.count({ where: { deletedAt: null } }),
      this.prisma.member.count({
        where: { deletedAt: null, isActive: true },
      }),
      this.prisma.member.count({
        where: { deletedAt: null, isActive: false },
      }),
      this.prisma.member.count({
        where: { deletedAt: null, isBlacklisted: true },
      }),
      this.prisma.member.groupBy({
        by: ['currentClass'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.guildWarDay.count({ where: { deletedAt: null } }),
      this.prisma.guildWarMatch.count({ where: { deletedAt: null } }),
      this.prisma.member.findMany({
        where: { deletedAt: null, guildWarAttendanceCount: { gt: 0 } },
        orderBy: { guildWarAttendanceCount: 'desc' },
        take: 10,
        select: {
          id: true,
          internalMemberId: true,
          currentName: true,
          guildWarAttendanceCount: true,
        },
      }),
      this.prisma.guildWarMatch.groupBy({
        by: ['mvpMemberId'],
        where: { deletedAt: null, mvpMemberId: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { mvpMemberId: 'desc' } },
        take: 10,
      }),
      this.prisma.giveawayWinner.count(),
      this.prisma.giveawayWinner.groupBy({
        by: ['memberId'],
        _count: { _all: true },
        orderBy: { _count: { memberId: 'desc' } },
        take: 10,
      }),
      this.prisma.dungeonSchedule.count({ where: { deletedAt: null } }),
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
      this.prisma.member.findMany({
        where: { deletedAt: null, contributionPoint: { gt: 0 } },
        orderBy: { contributionPoint: 'desc' },
        take: 10,
        select: {
          id: true,
          internalMemberId: true,
          currentName: true,
          contributionPoint: true,
        },
      }),
      this.prisma.memberUserGroupAssignment.groupBy({
        by: ['userGroupId'],
        where: { member: { deletedAt: null } },
        _count: { _all: true },
      }),
      this.prisma.memberUserGroupAssignment.groupBy({
        by: ['userGroupId'],
        where: { member: { deletedAt: null, isActive: true } },
        _count: { _all: true },
      }),
      this.prisma.userGroup.findMany({
        where: { deletedAt: null },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true, type: true },
      }),
    ]);

    const classCountMap = new Map(
      classGroups.map((g) => [g.currentClass, g._count._all]),
    );

    const mvpMemberIds = topMvp
      .map((m) => m.mvpMemberId)
      .filter((id): id is string => Boolean(id));
    const winnerMemberIds = topWinners.map((w) => w.memberId);
    const leaderIds = topLeaders
      .map((l) => l.leaderId)
      .filter((id): id is string => Boolean(id));
    const dungeonMemberIds = topDungeonMembers.map((m) => m.memberId);

    const lookupIds = [
      ...new Set([
        ...mvpMemberIds,
        ...winnerMemberIds,
        ...leaderIds,
        ...dungeonMemberIds,
      ]),
    ];

    const members = await this.prisma.member.findMany({
      where: { id: { in: lookupIds } },
      select: { id: true, internalMemberId: true, currentName: true },
    });
    const memberMap = new Map(members.map((m) => [m.id, m]));

    const userGroupTotalMap = new Map(
      userGroupTotals.map((g) => [g.userGroupId, g._count._all]),
    );
    const userGroupActiveMap = new Map(
      userGroupActiveTotals.map((g) => [g.userGroupId, g._count._all]),
    );

    const userGroupDistribution = userGroups.map((group) => ({
      userGroupId: group.id,
      name: group.name,
      type: group.type as UserGroupType,
      count: userGroupTotalMap.get(group.id) ?? 0,
      activeCount: userGroupActiveMap.get(group.id) ?? 0,
    }));

    return {
      members: {
        total: totalMembers,
        active: activeMembers,
        inactive: inactiveMembers,
        blacklisted: blacklistedMembers,
        classDistribution: GAME_CLASSES.map((gameClass) => ({
          class: gameClass as GameClass,
          label: GAME_CLASS_LABELS[gameClass as GameClass],
          count: classCountMap.get(gameClass) ?? 0,
        })),
        userGroupDistribution,
      },
      guildWar: {
        totalDays: totalWarDays,
        totalMatches: totalMatches,
        attendanceRanking: attendanceRanking.map((m) => ({
          memberId: m.id,
          internalMemberId: m.internalMemberId,
          name: m.currentName,
          count: m.guildWarAttendanceCount,
        })),
        topMvp: topMvp.map((m) => {
          const member = memberMap.get(m.mvpMemberId!);
          return {
            memberId: m.mvpMemberId!,
            internalMemberId: member?.internalMemberId ?? '',
            name: member?.currentName ?? 'Unknown',
            count: m._count._all,
          };
        }),
      },
      giveaway: {
        totalSpins: totalSpins,
        topWinners: topWinners.map((w) => {
          const member = memberMap.get(w.memberId);
          return {
            memberId: w.memberId,
            internalMemberId: member?.internalMemberId ?? '',
            name: member?.currentName ?? 'Unknown',
            count: w._count._all,
          };
        }),
      },
      dungeon: {
        totalSchedules: totalSchedules,
        mostActiveLeaders: topLeaders.map((l) => {
          const member = memberMap.get(l.leaderId!);
          return {
            memberId: l.leaderId!,
            internalMemberId: member?.internalMemberId ?? '',
            name: member?.currentName ?? 'Unknown',
            count: l._count._all,
          };
        }),
        mostActiveMembers: topDungeonMembers.map((m) => {
          const member = memberMap.get(m.memberId);
          return {
            memberId: m.memberId,
            internalMemberId: member?.internalMemberId ?? '',
            name: member?.currentName ?? 'Unknown',
            count: m._count._all,
          };
        }),
      },
      contribution: {
        ranking: contributionRanking.map((m) => ({
          memberId: m.id,
          internalMemberId: m.internalMemberId,
          name: m.currentName,
          points: m.contributionPoint,
        })),
      },
    };
  }

  async getClassDistribution() {
    const stats = await this.getDashboardStats();
    return stats.members.classDistribution;
  }

  async getAttendanceRanking(limit = 20) {
    const members = await this.prisma.member.findMany({
      where: { deletedAt: null, guildWarAttendanceCount: { gt: 0 } },
      orderBy: { guildWarAttendanceCount: 'desc' },
      take: limit,
      select: {
        id: true,
        internalMemberId: true,
        currentName: true,
        guildWarAttendanceCount: true,
      },
    });

    return members.map((m) => ({
      memberId: m.id,
      internalMemberId: m.internalMemberId,
      name: m.currentName,
      count: m.guildWarAttendanceCount,
    }));
  }

  async getTopMvp(limit = 20) {
    const stats = await this.getDashboardStats();
    return stats.guildWar.topMvp.slice(0, limit);
  }

  async getTopGiveawayWinners(limit = 20) {
    const stats = await this.getDashboardStats();
    return stats.giveaway.topWinners.slice(0, limit);
  }

  async getContributionRanking(limit = 20) {
    const stats = await this.getDashboardStats();
    return stats.contribution.ranking.slice(0, limit);
  }
}
