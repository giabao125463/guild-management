import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import {
  AuditAction,
  GameClass,
  Member,
  MemberTimelineEventType,
  Prisma,
  UserGroupType,
} from '@prisma/client';
import {
  ImportResult,
  MemberDto,
  MemberUserGroupRef,
  USER_GROUP_TYPES,
  UserGroupType as SharedUserGroupType,
} from '@guild/shared-types';
import {
  buildPaginationMeta,
  clampPagination,
  formatDate,
} from '@guild/shared-utils';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateMemberDto,
  MemberQueryDto,
  UpdateMemberDto,
} from './dto/member.dto';
import { ExcelService, MemberExcelRow } from './excel.service';

type AssignmentWithGroup = {
  type: UserGroupType;
  userGroup: { id: string; name: string; type: UserGroupType };
};

type MemberWithHistory = Member & {
  historicalNames: { name: string }[];
  historicalClasses: { gameClass: GameClass }[];
  userGroupAssignments: AssignmentWithGroup[];
};

type UserGroupAssignmentInput = Partial<
  Record<SharedUserGroupType, string | null | undefined>
>;

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly excel: ExcelService,
  ) {}

  private memberInclude = {
    historicalNames: { orderBy: { changedAt: 'desc' as const } },
    historicalClasses: { orderBy: { changedAt: 'desc' as const } },
    userGroupAssignments: {
      include: {
        userGroup: { select: { id: true, name: true, type: true } },
      },
    },
  };

  private mapUserGroups(
    assignments: AssignmentWithGroup[],
  ): {
    userGroups: Partial<Record<SharedUserGroupType, MemberUserGroupRef>>;
    kimLangUserGroup: MemberUserGroupRef | null;
  } {
    const userGroups: Partial<Record<SharedUserGroupType, MemberUserGroupRef>> =
      {};
    for (const assignment of assignments) {
      const ref: MemberUserGroupRef = {
        id: assignment.userGroup.id,
        name: assignment.userGroup.name,
        type: assignment.type as SharedUserGroupType,
      };
      userGroups[assignment.type as SharedUserGroupType] = ref;
    }
    return {
      userGroups,
      kimLangUserGroup: userGroups[SharedUserGroupType.KIM_LANG] ?? null,
    };
  }

  private toDto(member: MemberWithHistory): MemberDto {
    const { userGroups, kimLangUserGroup } = this.mapUserGroups(
      member.userGroupAssignments,
    );
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
      kimLangUserGroup,
      historicalNames: member.historicalNames.map((h) => h.name),
      historicalClasses: member.historicalClasses.map(
        (h) => h.gameClass as MemberDto['currentClass'],
      ),
      createdAt: member.createdAt.toISOString(),
      updatedAt: member.updatedAt.toISOString(),
      deletedAt: formatDate(member.deletedAt),
    };
  }

  private extractUserGroupAssignments(
    dto: CreateMemberDto | UpdateMemberDto,
  ): UserGroupAssignmentInput {
    return {
      [SharedUserGroupType.KIM_LANG]: dto.kimLangUserGroupId,
      [SharedUserGroupType.TEAM]: dto.teamUserGroupId,
      [SharedUserGroupType.TINH_DUYEN]: dto.tinhDuyenUserGroupId,
    };
  }

  private async syncUserGroupAssignments(
    tx: Prisma.TransactionClient,
    memberId: string,
    assignments: UserGroupAssignmentInput,
  ) {
    for (const type of USER_GROUP_TYPES) {
      const groupId = assignments[type];
      if (groupId === undefined) continue;

      if (groupId === null || groupId === '') {
        await tx.memberUserGroupAssignment.deleteMany({
          where: { memberId, type: type as UserGroupType },
        });
        continue;
      }

      const group = await tx.userGroup.findFirst({
        where: {
          id: groupId,
          type: type as UserGroupType,
          deletedAt: null,
          isActive: true,
        },
      });
      if (!group) {
        throw new NotFoundException(`User group not found for type ${type}`);
      }

      await tx.memberUserGroupAssignment.upsert({
        where: {
          memberId_type: {
            memberId,
            type: type as UserGroupType,
          },
        },
        create: {
          memberId,
          userGroupId: group.id,
          type: type as UserGroupType,
        },
        update: { userGroupId: group.id },
      });
    }
  }

  private async resolveKimLangUserGroupIdByName(
    name: string | null | undefined,
  ): Promise<string | null | undefined> {
    if (name === undefined) return undefined;
    const trimmed = name?.trim();
    if (!trimmed) return null;

    const existing = await this.prisma.userGroup.findFirst({
      where: {
        type: UserGroupType.KIM_LANG,
        name: { equals: trimmed, mode: 'insensitive' },
        deletedAt: null,
      },
    });
    if (existing) return existing.id;

    const created = await this.prisma.userGroup.create({
      data: {
        name: trimmed,
        type: UserGroupType.KIM_LANG,
      },
    });
    return created.id;
  }

  async create(
    dto: CreateMemberDto,
    actor?: { id: string; email: string },
  ): Promise<MemberDto> {
    const exists = await this.prisma.member.findFirst({
      where: { internalMemberId: dto.internalMemberId, deletedAt: null },
    });
    if (exists) {
      throw new ConflictException('internalMemberId already exists');
    }

    const member = await this.prisma.$transaction(async (tx) => {
      const created = await tx.member.create({
        data: {
          internalMemberId: dto.internalMemberId,
          currentName: dto.currentName,
          currentClass: dto.currentClass,
          joinDate: dto.joinDate ? new Date(dto.joinDate) : new Date(),
          leaveDate: dto.leaveDate ? new Date(dto.leaveDate) : null,
          isActive: dto.isActive ?? true,
          isBlacklisted: dto.isBlacklisted ?? false,
          relationship: dto.relationship ?? null,
          realLifeRelationship: dto.realLifeRelationship ?? null,
          tags: dto.tags ?? [],
          note: dto.note ?? null,
          contributionPoint: dto.contributionPoint ?? 0,
        },
      });

      await this.syncUserGroupAssignments(
        tx,
        created.id,
        this.extractUserGroupAssignments(dto),
      );

      await tx.memberTimeline.create({
        data: {
          memberId: created.id,
          eventType: MemberTimelineEventType.JOINED,
          description: `Member joined as ${created.currentName}`,
          newValue: created.currentName,
          createdBy: actor?.email ?? null,
        },
      });

      return tx.member.findFirstOrThrow({
        where: { id: created.id },
        include: this.memberInclude,
      });
    });

    await this.audit.log({
      userId: actor?.id,
      userEmail: actor?.email,
      action: AuditAction.CREATE,
      module: 'member',
      resourceId: member.id,
      details: { internalMemberId: member.internalMemberId },
    });

    return this.toDto(member);
  }

  async createBatch(
    members: CreateMemberDto[],
    actor?: { id: string; email: string },
  ): Promise<{
    created: number;
    failed: { index: number; internalMemberId: string; message: string }[];
  }> {
    const failed: {
      index: number;
      internalMemberId: string;
      message: string;
    }[] = [];
    let created = 0;

    const seenIds = new Set<string>();

    await this.prisma.$transaction(
      async (tx) => {
        for (let index = 0; index < members.length; index += 1) {
          const dto = members[index]!;
          const normalizedId = dto.internalMemberId.trim();

          if (seenIds.has(normalizedId.toLowerCase())) {
            failed.push({
              index,
              internalMemberId: normalizedId,
              message: 'Duplicate internalMemberId in batch',
            });
            continue;
          }
          seenIds.add(normalizedId.toLowerCase());

          const exists = await tx.member.findFirst({
            where: { internalMemberId: normalizedId, deletedAt: null },
          });
          if (exists) {
            failed.push({
              index,
              internalMemberId: normalizedId,
              message: 'internalMemberId already exists',
            });
            continue;
          }

          try {
            const member = await tx.member.create({
              data: {
                internalMemberId: normalizedId,
                currentName: dto.currentName,
                currentClass: dto.currentClass,
                joinDate: dto.joinDate ? new Date(dto.joinDate) : new Date(),
                leaveDate: dto.leaveDate ? new Date(dto.leaveDate) : null,
                isActive: dto.isActive ?? true,
                isBlacklisted: dto.isBlacklisted ?? false,
                relationship: dto.relationship ?? null,
                realLifeRelationship: dto.realLifeRelationship ?? null,
                tags: dto.tags ?? [],
                note: dto.note ?? null,
                contributionPoint: dto.contributionPoint ?? 0,
              },
            });

            await this.syncUserGroupAssignments(
              tx,
              member.id,
              this.extractUserGroupAssignments(dto),
            );

            await tx.memberTimeline.create({
              data: {
                memberId: member.id,
                eventType: MemberTimelineEventType.JOINED,
                description: `Member joined as ${member.currentName}`,
                newValue: member.currentName,
                createdBy: actor?.email ?? null,
              },
            });

            created += 1;
          } catch (error) {
            failed.push({
              index,
              internalMemberId: normalizedId,
              message:
                error instanceof Error ? error.message : 'Failed to create member',
            });
          }
        }
      },
      { timeout: 120_000 },
    );

    if (created > 0) {
      await this.audit.log({
        userId: actor?.id,
        userEmail: actor?.email,
        action: AuditAction.CREATE,
        module: 'member',
        details: { batchCreated: created, batchFailed: failed.length },
      });
    }

    return { created, failed };
  }

  async findAll(query: MemberQueryDto) {
    const { page, limit, skip } = clampPagination(query.page, query.limit);
    const where = this.buildWhere(query);

    const orderField =
      query.sortBy &&
      [
        'currentName',
        'internalMemberId',
        'currentClass',
        'contributionPoint',
        'guildWarAttendanceCount',
        'createdAt',
        'joinDate',
      ].includes(query.sortBy)
        ? query.sortBy
        : 'createdAt';

    const [members, total] = await Promise.all([
      this.prisma.member.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [orderField]: query.sortOrder === 'asc' ? 'asc' : 'desc',
        },
        include: this.memberInclude,
      }),
      this.prisma.member.count({ where }),
    ]);

    return {
      data: members.map((m) => this.toDto(m)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async findOne(id: string): Promise<MemberDto> {
    const member = await this.prisma.member.findFirst({
      where: { id, deletedAt: null },
      include: this.memberInclude,
    });
    if (!member) throw new NotFoundException('Member not found');
    return this.toDto(member);
  }

  async findByInternalId(internalMemberId: string): Promise<MemberDto> {
    const member = await this.prisma.member.findFirst({
      where: { internalMemberId, deletedAt: null },
      include: this.memberInclude,
    });
    if (!member) throw new NotFoundException('Member not found');
    return this.toDto(member);
  }

  async getTimeline(memberId: string) {
    await this.findOne(memberId);
    return this.prisma.memberTimeline.findMany({
      where: { memberId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(
    id: string,
    dto: UpdateMemberDto,
    actor?: { id: string; email: string },
  ): Promise<MemberDto> {
    const existing = await this.prisma.member.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Member not found');

    if (
      dto.internalMemberId &&
      dto.internalMemberId !== existing.internalMemberId
    ) {
      const dup = await this.prisma.member.findFirst({
        where: {
          internalMemberId: dto.internalMemberId,
          deletedAt: null,
          NOT: { id },
        },
      });
      if (dup) throw new ConflictException('internalMemberId already exists');
    }

    const member = await this.prisma.$transaction(async (tx) => {
      const timelineEvents: Prisma.MemberTimelineCreateManyInput[] = [];

      if (dto.currentName && dto.currentName !== existing.currentName) {
        await tx.memberNameHistory.create({
          data: {
            memberId: id,
            name: existing.currentName,
          },
        });
        timelineEvents.push({
          memberId: id,
          eventType: MemberTimelineEventType.NAME_CHANGED,
          description: `Name changed from ${existing.currentName} to ${dto.currentName}`,
          oldValue: existing.currentName,
          newValue: dto.currentName,
          createdBy: actor?.email ?? null,
        });
      }

      if (dto.currentClass && dto.currentClass !== existing.currentClass) {
        await tx.memberClassHistory.create({
          data: {
            memberId: id,
            gameClass: existing.currentClass,
          },
        });
        timelineEvents.push({
          memberId: id,
          eventType: MemberTimelineEventType.CLASS_CHANGED,
          description: `Class changed from ${existing.currentClass} to ${dto.currentClass}`,
          oldValue: existing.currentClass,
          newValue: dto.currentClass,
          createdBy: actor?.email ?? null,
        });
      }

      if (
        dto.isBlacklisted !== undefined &&
        dto.isBlacklisted !== existing.isBlacklisted
      ) {
        timelineEvents.push({
          memberId: id,
          eventType: dto.isBlacklisted
            ? MemberTimelineEventType.BLACKLISTED
            : MemberTimelineEventType.UNBLACKLISTED,
          description: dto.isBlacklisted
            ? 'Member blacklisted'
            : 'Member removed from blacklist',
          oldValue: String(existing.isBlacklisted),
          newValue: String(dto.isBlacklisted),
          createdBy: actor?.email ?? null,
        });
      }

      if (
        dto.contributionPoint !== undefined &&
        dto.contributionPoint !== existing.contributionPoint
      ) {
        timelineEvents.push({
          memberId: id,
          eventType: MemberTimelineEventType.CONTRIBUTION_UPDATED,
          description: `Contribution updated from ${existing.contributionPoint} to ${dto.contributionPoint}`,
          oldValue: String(existing.contributionPoint),
          newValue: String(dto.contributionPoint),
          createdBy: actor?.email ?? null,
        });
      }

      if (dto.note !== undefined && dto.note !== existing.note) {
        timelineEvents.push({
          memberId: id,
          eventType: MemberTimelineEventType.NOTE_UPDATED,
          description: 'Note updated',
          oldValue: existing.note,
          newValue: dto.note,
          createdBy: actor?.email ?? null,
        });
      }

      if (dto.isActive === false && existing.isActive) {
        timelineEvents.push({
          memberId: id,
          eventType: MemberTimelineEventType.LEFT,
          description: 'Member marked inactive',
          createdBy: actor?.email ?? null,
        });
      } else if (dto.isActive === true && !existing.isActive) {
        timelineEvents.push({
          memberId: id,
          eventType: MemberTimelineEventType.REJOINED,
          description: 'Member reactivated',
          createdBy: actor?.email ?? null,
        });
      }

      if (timelineEvents.length) {
        await tx.memberTimeline.createMany({ data: timelineEvents });
      }

      await tx.member.update({
        where: { id },
        data: {
          internalMemberId: dto.internalMemberId,
          currentName: dto.currentName,
          currentClass: dto.currentClass,
          joinDate: dto.joinDate ? new Date(dto.joinDate) : undefined,
          leaveDate: dto.leaveDate ? new Date(dto.leaveDate) : undefined,
          isActive: dto.isActive,
          isBlacklisted: dto.isBlacklisted,
          relationship: dto.relationship,
          realLifeRelationship: dto.realLifeRelationship,
          tags: dto.tags,
          note: dto.note,
          contributionPoint: dto.contributionPoint,
        },
      });

      await this.syncUserGroupAssignments(
        tx,
        id,
        this.extractUserGroupAssignments(dto),
      );

      return tx.member.findFirstOrThrow({
        where: { id },
        include: this.memberInclude,
      });
    });

    await this.audit.log({
      userId: actor?.id,
      userEmail: actor?.email,
      action: AuditAction.UPDATE,
      module: 'member',
      resourceId: id,
      details: { changes: dto },
    });

    return this.toDto(member);
  }

  async remove(id: string, actor?: { id: string; email: string }) {
    await this.findOne(id);
    await this.prisma.member.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    await this.audit.log({
      userId: actor?.id,
      userEmail: actor?.email,
      action: AuditAction.DELETE,
      module: 'member',
      resourceId: id,
    });

    return { success: true };
  }

  async exportAll(): Promise<MemberDto[]> {
    const members = await this.prisma.member.findMany({
      where: { deletedAt: null },
      include: this.memberInclude,
      orderBy: { internalMemberId: 'asc' },
    });
    return members.map((m) => this.toDto(m));
  }

  async previewImport(buffer: Buffer) {
    const { preview } = await this.excel.parseMemberImport(buffer, true);
    return preview;
  }

  async importMembers(
    buffer: Buffer,
    actor?: { id: string; email: string },
  ): Promise<ImportResult> {
    const { preview } = await this.excel.parseMemberImport(buffer, true);
    const result: ImportResult = {
      inserted: 0,
      updated: 0,
      failed: preview.errors.length,
      errors: [...preview.errors],
    };

    for (const row of preview.valid) {
      try {
        const existing = await this.prisma.member.findFirst({
          where: { internalMemberId: row.internalMemberId },
        });

        if (existing && existing.deletedAt) {
          result.failed += 1;
          result.errors.push({
            row: row.row,
            message: `Member ${row.internalMemberId} is deleted; restore manually`,
          });
          continue;
        }

        if (existing) {
          await this.applyImportRow(existing.id, row, actor);
          result.updated += 1;
        } else {
          await this.createFromImportRow(row, actor);
          result.inserted += 1;
        }
      } catch (err) {
        result.failed += 1;
        result.errors.push({
          row: row.row,
          message: err instanceof Error ? err.message : 'Import failed',
        });
      }
    }

    await this.audit.log({
      userId: actor?.id,
      userEmail: actor?.email,
      action: AuditAction.IMPORT,
      module: 'member',
      details: {
        inserted: result.inserted,
        updated: result.updated,
        failed: result.failed,
      },
    });

    return result;
  }

  private async createFromImportRow(
    row: MemberExcelRow,
    actor?: { id: string; email: string },
  ) {
    const kimLangUserGroupId = await this.resolveKimLangUserGroupIdByName(
      row.kimLang,
    );
    await this.create(
      {
        internalMemberId: row.internalMemberId,
        currentName: row.currentName,
        currentClass: row.currentClass,
        joinDate: row.joinDate?.toISOString(),
        isActive: row.isActive,
        isBlacklisted: row.isBlacklisted,
        kimLangUserGroupId,
        relationship: row.relationship ?? undefined,
        realLifeRelationship: row.realLifeRelationship ?? undefined,
        tags: row.tags,
        note: row.note ?? undefined,
        contributionPoint: row.contributionPoint,
      },
      actor,
    );
  }

  private async applyImportRow(
    id: string,
    row: MemberExcelRow,
    actor?: { id: string; email: string },
  ) {
    const kimLangUserGroupId = await this.resolveKimLangUserGroupIdByName(
      row.kimLang,
    );
    await this.update(
      id,
      {
        currentName: row.currentName,
        currentClass: row.currentClass,
        joinDate: row.joinDate?.toISOString(),
        isActive: row.isActive,
        isBlacklisted: row.isBlacklisted,
        kimLangUserGroupId,
        relationship: row.relationship ?? undefined,
        realLifeRelationship: row.realLifeRelationship ?? undefined,
        tags: row.tags,
        note: row.note ?? undefined,
        contributionPoint: row.contributionPoint,
      },
      actor,
    );
  }

  private buildWhere(query: MemberQueryDto): Prisma.MemberWhereInput {
    const where: Prisma.MemberWhereInput = { deletedAt: null };

    if (query.currentClass) where.currentClass = query.currentClass;
    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.isBlacklisted !== undefined) {
      where.isBlacklisted = query.isBlacklisted;
    }
    if (query.tag) {
      where.tags = { has: query.tag };
    }

    if (query.userGroupId) {
      const type = query.userGroupType ?? UserGroupType.KIM_LANG;
      if (query.userGroupId === 'none') {
        where.userGroupAssignments = {
          none: { type },
        };
      } else {
        where.userGroupAssignments = {
          some: { userGroupId: query.userGroupId, type },
        };
      }
    }

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { currentName: { contains: term, mode: 'insensitive' } },
        { internalMemberId: { contains: term, mode: 'insensitive' } },
        { relationship: { contains: term, mode: 'insensitive' } },
        { realLifeRelationship: { contains: term, mode: 'insensitive' } },
        { tags: { has: term } },
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
    }

    return where;
  }
}
