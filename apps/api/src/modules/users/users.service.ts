import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { ALL_PERMISSIONS } from '@guild/shared-types';
import { buildPaginationMeta, clampPagination } from '@guild/shared-utils';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { AuditService } from '../audit/audit.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly audit: AuditService,
  ) {}

  private sanitize(user: {
    id: string;
    email: string;
    name: string;
    permissions: string[];
    isActive: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      permissions: user.permissions,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private validatePermissions(permissions: string[]) {
    const invalid = permissions.filter(
      (p) => !ALL_PERMISSIONS.includes(p as (typeof ALL_PERMISSIONS)[number]),
    );
    if (invalid.length) {
      throw new BadRequestException(
        `Invalid permissions: ${invalid.join(', ')}`,
      );
    }
  }

  async create(dto: CreateUserDto, actor?: { id: string; email: string }) {
    this.validatePermissions(dto.permissions);
    const exists = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase(), deletedAt: null },
    });
    if (exists) throw new ConflictException('Email already exists');

    const passwordHash = await this.auth.hashPassword(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        name: dto.name,
        passwordHash,
        permissions: dto.permissions,
        isActive: dto.isActive ?? true,
      },
    });

    await this.audit.log({
      userId: actor?.id,
      userEmail: actor?.email,
      action: AuditAction.CREATE,
      module: 'user',
      resourceId: user.id,
      details: { email: user.email, permissions: user.permissions },
    });

    return this.sanitize(user);
  }

  async findAll(query: PaginationDto) {
    const { page, limit, skip } = clampPagination(query.page, query.limit);
    const where: Prisma.UserWhereInput = { deletedAt: null };
    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [query.sortBy &&
          ['email', 'name', 'createdAt', 'lastLoginAt'].includes(query.sortBy)
            ? query.sortBy
            : 'createdAt']: query.sortOrder === 'asc' ? 'asc' : 'desc',
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((u) => this.sanitize(u)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
    if (!user) throw new NotFoundException('User not found');
    return this.sanitize(user);
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    actor?: { id: string; email: string },
  ) {
    await this.findOne(id);
    if (dto.permissions) this.validatePermissions(dto.permissions);
    if (dto.email) {
      const exists = await this.prisma.user.findFirst({
        where: {
          email: dto.email.toLowerCase(),
          deletedAt: null,
          NOT: { id },
        },
      });
      if (exists) throw new ConflictException('Email already exists');
    }

    const data: Prisma.UserUpdateInput = {
      email: dto.email?.toLowerCase(),
      name: dto.name,
      permissions: dto.permissions,
      isActive: dto.isActive,
    };
    if (dto.password) {
      data.passwordHash = await this.auth.hashPassword(dto.password);
    }

    const user = await this.prisma.user.update({ where: { id }, data });
    await this.audit.log({
      userId: actor?.id,
      userEmail: actor?.email,
      action: AuditAction.UPDATE,
      module: 'user',
      resourceId: id,
      details: { changes: dto },
    });
    return this.sanitize(user);
  }

  async remove(id: string, actor?: { id: string; email: string }) {
    if (actor?.id === id) {
      throw new BadRequestException('Cannot delete your own account');
    }
    await this.findOne(id);
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    await this.prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit.log({
      userId: actor?.id,
      userEmail: actor?.email,
      action: AuditAction.DELETE,
      module: 'user',
      resourceId: id,
    });
    return { success: true };
  }

  async resetPassword(
    id: string,
    newPassword: string,
    actor?: { id: string; email: string },
  ) {
    await this.findOne(id);
    const passwordHash = await this.auth.hashPassword(newPassword);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
    await this.prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit.log({
      userId: actor?.id,
      userEmail: actor?.email,
      action: AuditAction.RESET_PASSWORD,
      module: 'user',
      resourceId: id,
    });
    return { success: true };
  }
}
