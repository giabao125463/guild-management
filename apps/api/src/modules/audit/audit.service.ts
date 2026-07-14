import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { buildPaginationMeta, clampPagination } from '@guild/shared-utils';

export interface AuditLogInput {
  userId?: string | null;
  userEmail?: string | null;
  action: AuditAction;
  module: string;
  resourceId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditLogInput) {
    return this.prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        userEmail: input.userEmail ?? null,
        action: input.action,
        module: input.module,
        resourceId: input.resourceId ?? null,
        details: (input.details ?? undefined) as
          Prisma.InputJsonValue | undefined,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  }

  async findAll(query: PaginationDto & { module?: string; action?: string }) {
    const { page, limit, skip } = clampPagination(query.page, query.limit);
    const where: Prisma.AuditLogWhereInput = {};

    if (query.module) where.module = query.module;
    if (query.action) where.action = query.action as AuditAction;
    if (query.search) {
      where.OR = [
        { userEmail: { contains: query.search, mode: 'insensitive' } },
        { module: { contains: query.search, mode: 'insensitive' } },
        { resourceId: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: query.sortOrder === 'asc' ? 'asc' : 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, meta: buildPaginationMeta(page, limit, total) };
  }

  async findOne(id: string) {
    return this.prisma.auditLog.findUnique({ where: { id } });
  }
}
