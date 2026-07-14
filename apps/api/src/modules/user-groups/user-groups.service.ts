import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { AuditAction, Prisma, UserGroupType } from '@prisma/client';
import { UserGroupDto } from '@guild/shared-types';
import {
  buildPaginationMeta,
  clampPagination,
  formatDate,
} from '@guild/shared-utils';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateUserGroupDto,
  UpdateUserGroupDto,
  UserGroupQueryDto,
} from './dto/user-group.dto';

@Injectable()
export class UserGroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private toDto(
    group: {
      id: string;
      name: string;
      type: UserGroupType;
      description: string | null;
      sortOrder: number;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
      deletedAt: Date | null;
      _count?: { memberAssignments: number };
    },
  ): UserGroupDto {
    return {
      id: group.id,
      name: group.name,
      type: group.type as UserGroupDto['type'],
      description: group.description,
      sortOrder: group.sortOrder,
      isActive: group.isActive,
      memberCount: group._count?.memberAssignments ?? 0,
      createdAt: group.createdAt.toISOString(),
      updatedAt: group.updatedAt.toISOString(),
      deletedAt: formatDate(group.deletedAt),
    };
  }

  private assignmentCountInclude = {
    _count: {
      select: {
        memberAssignments: {
          where: { member: { deletedAt: null } },
        },
      },
    },
  };

  private async assertUniqueName(
    name: string,
    type: UserGroupType,
    excludeId?: string,
  ) {
    const existing = await this.prisma.userGroup.findFirst({
      where: {
        name: { equals: name.trim(), mode: 'insensitive' },
        type,
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    if (existing) {
      throw new ConflictException(
        'User group name already exists for this type',
      );
    }
  }

  async create(
    dto: CreateUserGroupDto,
    actor?: { id: string; email: string },
  ): Promise<UserGroupDto> {
    await this.assertUniqueName(dto.name, dto.type);

    const group = await this.prisma.userGroup.create({
      data: {
        name: dto.name.trim(),
        type: dto.type,
        description: dto.description?.trim() || null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
      include: this.assignmentCountInclude,
    });

    await this.audit.log({
      userId: actor?.id,
      userEmail: actor?.email,
      action: AuditAction.CREATE,
      module: 'user_group',
      resourceId: group.id,
      details: { name: group.name, type: group.type },
    });

    return this.toDto(group);
  }

  async findAll(query: UserGroupQueryDto) {
    const { page, limit, skip } = clampPagination(query.page, query.limit);
    const where: Prisma.UserGroupWhereInput = { deletedAt: null };

    if (query.type) where.type = query.type;
    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [groups, total] = await Promise.all([
      this.prisma.userGroup.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: this.assignmentCountInclude,
      }),
      this.prisma.userGroup.count({ where }),
    ]);

    return {
      data: groups.map((g) => this.toDto(g)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async findOptions(type?: UserGroupType) {
    const groups = await this.prisma.userGroup.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        ...(type ? { type } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, type: true },
    });
    return groups.map((g) => ({
      id: g.id,
      name: g.name,
      type: g.type as UserGroupDto['type'],
    }));
  }

  async findOne(id: string): Promise<UserGroupDto> {
    const group = await this.prisma.userGroup.findFirst({
      where: { id, deletedAt: null },
      include: this.assignmentCountInclude,
    });
    if (!group) throw new NotFoundException('User group not found');
    return this.toDto(group);
  }

  async update(
    id: string,
    dto: UpdateUserGroupDto,
    actor?: { id: string; email: string },
  ): Promise<UserGroupDto> {
    const existing = await this.findOne(id);
    const nextType = dto.type ?? (existing.type as UserGroupType);
    if (dto.name !== undefined) {
      await this.assertUniqueName(dto.name, nextType, id);
    } else if (dto.type !== undefined && dto.type !== existing.type) {
      await this.assertUniqueName(existing.name, dto.type, id);
    }

    const group = await this.prisma.userGroup.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        type: dto.type,
        description:
          dto.description !== undefined
            ? dto.description?.trim() || null
            : undefined,
        sortOrder: dto.sortOrder,
        isActive: dto.isActive,
      },
      include: this.assignmentCountInclude,
    });

    await this.audit.log({
      userId: actor?.id,
      userEmail: actor?.email,
      action: AuditAction.UPDATE,
      module: 'user_group',
      resourceId: id,
      details: { changes: dto },
    });

    return this.toDto(group);
  }

  async remove(id: string, actor?: { id: string; email: string }) {
    await this.findOne(id);
    await this.prisma.$transaction([
      this.prisma.memberUserGroupAssignment.deleteMany({
        where: { userGroupId: id },
      }),
      this.prisma.userGroup.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
      }),
    ]);

    await this.audit.log({
      userId: actor?.id,
      userEmail: actor?.email,
      action: AuditAction.DELETE,
      module: 'user_group',
      resourceId: id,
    });

    return { success: true };
  }
}
