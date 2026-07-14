import {
  PrismaClient,
  GameClass,
  MemberTimelineEventType,
  DungeonStatus,
  GiveawayFilterType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  ALL_PERMISSIONS,
  PERMISSION_GROUPS,
} from '@guild/shared-types';

const prisma = new PrismaClient();

function lastSaturday(offsetWeeks = 0): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = day >= 6 ? day - 6 : day + 1;
  d.setDate(d.getDate() - diff - offsetWeeks * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function main() {
  console.log('Seeding database...');

  const adminPassword = await bcrypt.hash('Admin@123456', 12);
  const viewerPassword = await bcrypt.hash('Viewer@123456', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@guild.local' },
    update: {
      passwordHash: adminPassword,
      permissions: ALL_PERMISSIONS,
      isActive: true,
      deletedAt: null,
    },
    create: {
      email: 'admin@guild.local',
      name: 'System Admin',
      passwordHash: adminPassword,
      permissions: ALL_PERMISSIONS,
      isActive: true,
    },
  });

  const viewer = await prisma.user.upsert({
    where: { email: 'viewer@guild.local' },
    update: {
      passwordHash: viewerPassword,
      permissions: [
        ...PERMISSION_GROUPS.member,
        ...PERMISSION_GROUPS.guildwar,
        ...PERMISSION_GROUPS.dungeon,
        ...PERMISSION_GROUPS.giveaway,
        ...PERMISSION_GROUPS.report,
        ...PERMISSION_GROUPS.userGroup.slice(0, 1),
      ],
      isActive: true,
      deletedAt: null,
    },
    create: {
      email: 'viewer@guild.local',
      name: 'Guild Viewer',
      passwordHash: viewerPassword,
      permissions: [
        ...PERMISSION_GROUPS.member,
        ...PERMISSION_GROUPS.guildwar,
        ...PERMISSION_GROUPS.dungeon,
        ...PERMISSION_GROUPS.giveaway,
        ...PERMISSION_GROUPS.report,
        ...PERMISSION_GROUPS.userGroup.slice(0, 1),
      ],
      isActive: true,
    },
  });

  const userGroupSeeds = [
    { name: 'Kim Lang Bắc', description: 'Nhóm Kim Lang phía Bắc', sortOrder: 1, type: 'KIM_LANG' as const },
    { name: 'Kim Lang Nam', description: 'Nhóm Kim Lang phía Nam', sortOrder: 2, type: 'KIM_LANG' as const },
    { name: 'Team PVP', description: 'Đội thi đấu', sortOrder: 3, type: 'TEAM' as const },
    { name: 'Tình duyên', description: 'Nhóm tình duyên', sortOrder: 4, type: 'TINH_DUYEN' as const },
  ];

  const userGroupsByType: Record<string, { id: string; name: string; type: string }[]> = {
    KIM_LANG: [],
    TEAM: [],
    TINH_DUYEN: [],
  };
  for (const seed of userGroupSeeds) {
    const existing = await prisma.userGroup.findFirst({
      where: { name: seed.name, type: seed.type, deletedAt: null },
    });
    const group =
      existing ??
      (await prisma.userGroup.create({
        data: seed,
      }));
    userGroupsByType[seed.type]!.push(group);
  }

  const memberSeeds = [
    { id: 'M001', name: 'Long Ngâm Kiếm', cls: GameClass.LONG_NGAM, tags: ['core', 'pvp'], cp: 1200 },
    { id: 'M002', name: 'Thiết Y Healer', cls: GameClass.THIET_Y, tags: ['core'], cp: 980 },
    { id: 'M003', name: 'Tố Vấn Master', cls: GameClass.TO_VAN, tags: ['officer'], cp: 1500 },
    { id: 'M004', name: 'Huyết Hà Blade', cls: GameClass.HUYET_HA, tags: ['pvp'], cp: 870 },
    { id: 'M005', name: 'Thần Tương Tank', cls: GameClass.THAN_TUONG, tags: ['core', 'tank'], cp: 1100 },
    { id: 'M006', name: 'Cửu Linh Mage', cls: GameClass.CUU_LINH, tags: ['farm'], cp: 650 },
    { id: 'M007', name: 'Toái Mộng Assassin', cls: GameClass.TOAI_MONG, tags: ['pvp'], cp: 920 },
    { id: 'M008', name: 'Long Ngâm Alt', cls: GameClass.LONG_NGAM, tags: ['alt'], cp: 300, inactive: true },
    { id: 'M009', name: 'Thiết Y Support', cls: GameClass.THIET_Y, tags: ['support'], cp: 540 },
    { id: 'M010', name: 'Tố Vấn Scholar', cls: GameClass.TO_VAN, tags: ['newbie'], cp: 200 },
    { id: 'M011', name: 'Huyết Hà Raider', cls: GameClass.HUYET_HA, tags: ['raid'], cp: 760 },
    { id: 'M012', name: 'Thần Tương Guard', cls: GameClass.THAN_TUONG, tags: ['core'], cp: 890 },
  ];

  const members = [];
  for (let i = 0; i < memberSeeds.length; i++) {
    const seed = memberSeeds[i]!;
    const member = await prisma.member.upsert({
      where: { internalMemberId: seed.id },
      update: {
        currentName: seed.name,
        currentClass: seed.cls,
        tags: seed.tags,
        contributionPoint: seed.cp,
        isActive: !seed.inactive,
        deletedAt: null,
      },
      create: {
        internalMemberId: seed.id,
        currentName: seed.name,
        currentClass: seed.cls,
        joinDate: new Date('2023-06-01'),
        tags: seed.tags,
        contributionPoint: seed.cp,
        relationship: seed.id === 'M003' ? 'Officer' : 'Member',
        isActive: !seed.inactive,
      },
    });

    const kimLangGroup =
      userGroupsByType.KIM_LANG[i % userGroupsByType.KIM_LANG.length];
    const teamGroup = userGroupsByType.TEAM[i % userGroupsByType.TEAM.length];
    const tinhDuyenGroup =
      userGroupsByType.TINH_DUYEN[i % userGroupsByType.TINH_DUYEN.length];

    for (const assignment of [
      { type: 'KIM_LANG' as const, group: kimLangGroup },
      { type: 'TEAM' as const, group: teamGroup },
      { type: 'TINH_DUYEN' as const, group: tinhDuyenGroup },
    ]) {
      if (!assignment.group) continue;
      await prisma.memberUserGroupAssignment.upsert({
        where: {
          memberId_type: {
            memberId: member.id,
            type: assignment.type,
          },
        },
        create: {
          memberId: member.id,
          userGroupId: assignment.group.id,
          type: assignment.type,
        },
        update: { userGroupId: assignment.group.id },
      });
    }

    members.push(member);
  }

  const m001 = members.find((m) => m.internalMemberId === 'M001')!;
  const m002 = members.find((m) => m.internalMemberId === 'M002')!;
  const m003 = members.find((m) => m.internalMemberId === 'M003')!;

  await prisma.memberNameHistory.deleteMany({ where: { memberId: m001.id } });
  await prisma.memberNameHistory.create({
    data: { memberId: m001.id, name: 'Long Ngâm Old', changedAt: new Date('2024-01-10') },
  });

  await prisma.memberClassHistory.deleteMany({ where: { memberId: m002.id } });
  await prisma.memberClassHistory.create({
    data: { memberId: m002.id, gameClass: GameClass.CUU_LINH, changedAt: new Date('2024-02-15') },
  });

  await prisma.memberTimeline.deleteMany({
    where: { memberId: { in: [m001.id, m002.id, m003.id] } },
  });
  await prisma.memberTimeline.createMany({
    data: [
      {
        memberId: m001.id,
        eventType: MemberTimelineEventType.JOINED,
        description: 'Member joined',
        newValue: 'Long Ngâm Old',
      },
      {
        memberId: m001.id,
        eventType: MemberTimelineEventType.NAME_CHANGED,
        description: 'Renamed to Long Ngâm Kiếm',
        oldValue: 'Long Ngâm Old',
        newValue: 'Long Ngâm Kiếm',
      },
      {
        memberId: m002.id,
        eventType: MemberTimelineEventType.CLASS_CHANGED,
        description: 'Class changed from Cửu Linh to Thiết Y',
        oldValue: GameClass.CUU_LINH,
        newValue: GameClass.THIET_Y,
      },
      {
        memberId: m003.id,
        eventType: MemberTimelineEventType.CONTRIBUTION_UPDATED,
        description: 'Contribution updated',
        oldValue: '1000',
        newValue: '1500',
      },
    ],
  });

  const warDate1 = lastSaturday(1);
  const warDate2 = lastSaturday(0);

  const warDay1 = await prisma.guildWarDay.upsert({
    where: { date: warDate1 },
    update: { note: 'Seed war day 1', deletedAt: null },
    create: { date: warDate1, note: 'Seed war day 1' },
  });

  const warDay2 = await prisma.guildWarDay.upsert({
    where: { date: warDate2 },
    update: { note: 'Seed war day 2', deletedAt: null },
    create: { date: warDate2, note: 'Seed war day 2' },
  });

  for (const day of [warDay1, warDay2]) {
    await prisma.guildWarMatch.deleteMany({ where: { guildWarDayId: day.id } });
  }

  const match1 = await prisma.guildWarMatch.create({
    data: {
      guildWarDayId: warDay1.id,
      name: 'Trận 1',
      order: 1,
      mvpMemberId: m001.id,
    },
  });
  const match2 = await prisma.guildWarMatch.create({
    data: {
      guildWarDayId: warDay1.id,
      name: 'Trận 2',
      order: 2,
      mvpMemberId: m003.id,
    },
  });
  const match3 = await prisma.guildWarMatch.create({
    data: {
      guildWarDayId: warDay2.id,
      name: 'Trận 1',
      order: 1,
      mvpMemberId: m002.id,
    },
  });

  const participantMemberIds = members
    .filter((m) => m.isActive)
    .slice(0, 8)
    .map((m) => m.id);

  for (const memberId of participantMemberIds) {
    await prisma.guildWarParticipant.upsert({
      where: { matchId_memberId: { matchId: match1.id, memberId } },
      update: {},
      create: { matchId: match1.id, memberId },
    });
    await prisma.guildWarParticipant.upsert({
      where: { matchId_memberId: { matchId: match2.id, memberId } },
      update: {},
      create: { matchId: match2.id, memberId },
    });
  }

  for (const memberId of participantMemberIds.slice(0, 5)) {
    await prisma.guildWarParticipant.upsert({
      where: { matchId_memberId: { matchId: match3.id, memberId } },
      update: {},
      create: { matchId: match3.id, memberId },
    });
  }

  for (const member of members) {
    const uniqueDays = await prisma.guildWarDay.count({
      where: {
        deletedAt: null,
        matches: {
          some: {
            deletedAt: null,
            participants: { some: { memberId: member.id } },
          },
        },
      },
    });
    const participationCount = await prisma.guildWarParticipant.count({
      where: {
        memberId: member.id,
        match: { deletedAt: null },
      },
    });
    await prisma.member.update({
      where: { id: member.id },
      data: {
        guildWarAttendanceCount: uniqueDays,
        contributionPoint: participationCount,
      },
    });
  }

  await prisma.dungeonSchedule.deleteMany({});
  const dungeon = await prisma.dungeonSchedule.create({
    data: {
      title: 'Phó Bản Tuần - Thần Long',
      description: 'Weekly raid schedule',
      scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      maxPlayers: 6,
      leaderId: m003.id,
      requiredClasses: [GameClass.THIET_Y, GameClass.THAN_TUONG],
      status: DungeonStatus.OPEN,
      registrations: {
        create: participantMemberIds.slice(0, 4).map((memberId) => ({ memberId })),
      },
    },
  });

  await prisma.giveawayWinner.deleteMany({});
  await prisma.giveaway.deleteMany({});
  const spunCandidates = participantMemberIds.slice(0, 6);
  const winnerId = spunCandidates[0]!;
  const winner2Id = spunCandidates[1]!;

  const seededGiveaway = await prisma.giveaway.create({
    data: {
      guildWarDayId: warDay1.id,
      filterType: GiveawayFilterType.ALL_MATCHES_TODAY,
      candidateIds: spunCandidates,
      candidateCount: spunCandidates.length,
      winnerMemberId: winner2Id,
      spunAt: new Date(),
      spunBy: admin.id,
      winners: {
        create: [
          {
            memberId: winnerId,
            order: 1,
            spunAt: new Date(),
            spunBy: admin.id,
          },
          {
            memberId: winner2Id,
            order: 2,
            spunAt: new Date(),
            spunBy: admin.id,
          },
        ],
      },
    },
  });
  void seededGiveaway;

  console.log('Seed completed.');
  console.log(`Admin: admin@guild.local / Admin@123456 (${admin.id})`);
  console.log(`Viewer: viewer@guild.local / Viewer@123456 (${viewer.id})`);
  console.log(`Members: ${members.length}, Dungeon: ${dungeon.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
