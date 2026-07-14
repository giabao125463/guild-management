import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Permission } from '@guild/shared-types';
import { RequirePermissions } from '../../common/decorators/auth.decorators';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { AuditService } from './audit.service';
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

class AuditQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  module?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  action?: string;
}

@ApiTags('Audit')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermissions(Permission.AUDIT_READ)
  @ApiOperation({ summary: 'List audit logs' })
  findAll(@Query() query: AuditQueryDto) {
    return this.auditService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(Permission.AUDIT_READ)
  @ApiOperation({ summary: 'Get audit log by id' })
  async findOne(@Param('id') id: string) {
    const log = await this.auditService.findOne(id);
    if (!log) throw new NotFoundException('Audit log not found');
    return log;
  }
}
