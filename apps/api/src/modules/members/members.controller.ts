import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { Response } from 'express';
import { Permission } from '@guild/shared-types';
import {
  RequirePermissions,
  CurrentUser,
} from '../../common/decorators/auth.decorators';
import { MembersService } from './members.service';
import { ExcelService } from './excel.service';
import {
  CreateMemberDto,
  UpdateMemberDto,
  MemberQueryDto,
  BatchCreateMembersDto,
} from './dto/member.dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '@prisma/client';

@ApiTags('Members')
@ApiBearerAuth()
@Controller('members')
export class MembersController {
  constructor(
    private readonly membersService: MembersService,
    private readonly excelService: ExcelService,
    private readonly audit: AuditService,
  ) {}

  @Post()
  @RequirePermissions(Permission.MEMBER_WRITE)
  @ApiOperation({ summary: 'Create member' })
  create(
    @Body() dto: CreateMemberDto,
    @CurrentUser() actor: { id: string; email: string },
  ) {
    return this.membersService.create(dto, actor);
  }

  @Post('batch')
  @RequirePermissions(Permission.MEMBER_WRITE)
  @ApiOperation({ summary: 'Create multiple members in one request' })
  createBatch(
    @Body() dto: BatchCreateMembersDto,
    @CurrentUser() actor: { id: string; email: string },
  ) {
    return this.membersService.createBatch(dto.members, actor);
  }

  @Get()
  @RequirePermissions(Permission.MEMBER_READ)
  @ApiOperation({ summary: 'List members with search and filters' })
  findAll(@Query() query: MemberQueryDto) {
    return this.membersService.findAll(query);
  }

  @Get('export/excel')
  @RequirePermissions(Permission.MEMBER_READ)
  @ApiOperation({ summary: 'Export members to Excel' })
  async exportExcel(
    @Res() res: Response,
    @CurrentUser() actor: { id: string; email: string },
  ) {
    const members = await this.membersService.exportAll();
    const buffer = await this.excelService.exportMembers(members);

    await this.audit.log({
      userId: actor.id,
      userEmail: actor.email,
      action: AuditAction.EXPORT,
      module: 'member',
      details: { count: members.length },
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=members-export.xlsx',
    );
    res.send(buffer);
  }

  @Get('template/excel')
  @RequirePermissions(Permission.MEMBER_IMPORT)
  @ApiOperation({ summary: 'Download member import template' })
  async downloadTemplate(@Res() res: Response) {
    const buffer = await this.excelService.buildMemberTemplate();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=members-template.xlsx',
    );
    res.send(buffer);
  }

  @Post('import/preview')
  @RequirePermissions(Permission.MEMBER_IMPORT)
  @ApiOperation({ summary: 'Preview member Excel import with validation' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  previewImport(@UploadedFile() file?: Express.Multer.File) {
    if (!file?.buffer) {
      throw new BadRequestException('Excel file is required');
    }
    return this.membersService.previewImport(file.buffer);
  }

  @Post('import')
  @RequirePermissions(Permission.MEMBER_IMPORT)
  @ApiOperation({ summary: 'Import members from Excel' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  importMembers(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() actor: { id: string; email: string },
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Excel file is required');
    }
    return this.membersService.importMembers(file.buffer, actor);
  }

  @Get('by-internal/:internalMemberId')
  @RequirePermissions(Permission.MEMBER_READ)
  @ApiOperation({ summary: 'Get member by internal ID' })
  findByInternalId(@Param('internalMemberId') internalMemberId: string) {
    return this.membersService.findByInternalId(internalMemberId);
  }

  @Get(':id/timeline')
  @RequirePermissions(Permission.MEMBER_READ)
  @ApiOperation({ summary: 'Get member timeline' })
  getTimeline(@Param('id') id: string) {
    return this.membersService.getTimeline(id);
  }

  @Get(':id')
  @RequirePermissions(Permission.MEMBER_READ)
  @ApiOperation({ summary: 'Get member by id' })
  findOne(@Param('id') id: string) {
    return this.membersService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.MEMBER_WRITE)
  @ApiOperation({ summary: 'Update member' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMemberDto,
    @CurrentUser() actor: { id: string; email: string },
  ) {
    return this.membersService.update(id, dto, actor);
  }

  @Delete(':id')
  @RequirePermissions(Permission.MEMBER_DELETE)
  @ApiOperation({ summary: 'Soft delete member' })
  remove(
    @Param('id') id: string,
    @CurrentUser() actor: { id: string; email: string },
  ) {
    return this.membersService.remove(id, actor);
  }
}
