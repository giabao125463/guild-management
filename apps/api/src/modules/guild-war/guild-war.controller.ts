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
import { GuildWarService } from './guild-war.service';
import {
  AddParticipantsDto,
  AddParticipantsByNamesDto,
  CreateGuildWarDayDto,
  CreateGuildWarMatchDto,
  GuildWarQueryDto,
  UpdateGuildWarDayDto,
  UpdateGuildWarMatchDto,
} from './dto/guild-war.dto';

@ApiTags('Guild War')
@ApiBearerAuth()
@Controller('guild-war')
export class GuildWarController {
  constructor(private readonly guildWarService: GuildWarService) {}

  @Post('days')
  @RequirePermissions(Permission.GUILDWAR_WRITE)
  @ApiOperation({ summary: 'Create guild war day' })
  createDay(
    @Body() dto: CreateGuildWarDayDto,
    @CurrentUser() actor: { id: string; email: string },
  ) {
    return this.guildWarService.createDay(dto, actor);
  }

  @Post('days/auto-sync')
  @RequirePermissions(Permission.GUILDWAR_WRITE)
  @ApiOperation({ summary: 'Tạo ngày bang chiến thứ Bảy tự động (4 tuần tới)' })
  autoSyncDays() {
    return this.guildWarService.ensureSaturdaySchedule();
  }

  @Get('days')
  @RequirePermissions(Permission.GUILDWAR_READ)
  @ApiOperation({ summary: 'List guild war days' })
  findAllDays(@Query() query: GuildWarQueryDto) {
    return this.guildWarService.findAllDays(query);
  }

  @Get('days/:id')
  @RequirePermissions(Permission.GUILDWAR_READ)
  @ApiOperation({ summary: 'Get guild war day with matches' })
  findDay(@Param('id') id: string) {
    return this.guildWarService.findDay(id);
  }

  @Patch('days/:id')
  @RequirePermissions(Permission.GUILDWAR_WRITE)
  @ApiOperation({ summary: 'Update guild war day' })
  updateDay(
    @Param('id') id: string,
    @Body() dto: UpdateGuildWarDayDto,
    @CurrentUser() actor: { id: string; email: string },
  ) {
    return this.guildWarService.updateDay(id, dto, actor);
  }

  @Delete('days/:id')
  @RequirePermissions(Permission.GUILDWAR_DELETE)
  @ApiOperation({ summary: 'Soft delete guild war day' })
  removeDay(
    @Param('id') id: string,
    @CurrentUser() actor: { id: string; email: string },
  ) {
    return this.guildWarService.removeDay(id, actor);
  }

  @Post('days/:dayId/matches')
  @RequirePermissions(Permission.GUILDWAR_WRITE)
  @ApiOperation({ summary: 'Create match for guild war day' })
  createMatch(
    @Param('dayId') dayId: string,
    @Body() dto: CreateGuildWarMatchDto,
    @CurrentUser() actor: { id: string; email: string },
  ) {
    return this.guildWarService.createMatch(dayId, dto, actor);
  }

  @Get('matches/:id')
  @RequirePermissions(Permission.GUILDWAR_READ)
  @ApiOperation({ summary: 'Get match with participants' })
  findMatch(@Param('id') id: string) {
    return this.guildWarService.findMatch(id);
  }

  @Patch('matches/:id')
  @RequirePermissions(Permission.GUILDWAR_WRITE)
  @ApiOperation({ summary: 'Update match' })
  updateMatch(
    @Param('id') id: string,
    @Body() dto: UpdateGuildWarMatchDto,
    @CurrentUser() actor: { id: string; email: string },
  ) {
    return this.guildWarService.updateMatch(id, dto, actor);
  }

  @Delete('matches/:id')
  @RequirePermissions(Permission.GUILDWAR_DELETE)
  @ApiOperation({ summary: 'Soft delete match' })
  removeMatch(
    @Param('id') id: string,
    @CurrentUser() actor: { id: string; email: string },
  ) {
    return this.guildWarService.removeMatch(id, actor);
  }

  @Post('matches/:id/participants')
  @RequirePermissions(Permission.GUILDWAR_WRITE)
  @ApiOperation({ summary: 'Add participants to match' })
  addParticipants(
    @Param('id') id: string,
    @Body() dto: AddParticipantsDto,
    @CurrentUser() actor: { id: string; email: string },
  ) {
    return this.guildWarService.addParticipants(id, dto, actor);
  }

  @Post('matches/:id/participants/by-names')
  @RequirePermissions(Permission.GUILDWAR_WRITE)
  @ApiOperation({ summary: 'Add participants by member names' })
  addParticipantsByNames(
    @Param('id') id: string,
    @Body() dto: AddParticipantsByNamesDto,
    @CurrentUser() actor: { id: string; email: string },
  ) {
    return this.guildWarService.addParticipantsByNames(id, dto, actor);
  }

  @Delete('matches/:matchId/participants/:memberId')
  @RequirePermissions(Permission.GUILDWAR_WRITE)
  @ApiOperation({ summary: 'Remove participant from match' })
  removeParticipant(
    @Param('matchId') matchId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() actor: { id: string; email: string },
  ) {
    return this.guildWarService.removeParticipant(matchId, memberId, actor);
  }

  @Get('participants/template')
  @RequirePermissions(Permission.GUILDWAR_IMPORT)
  @ApiOperation({ summary: 'Download participant import template' })
  async downloadTemplate(@Res() res: Response) {
    const buffer = await this.guildWarService.buildParticipantTemplate();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=guild-war-participants-template.xlsx',
    );
    res.send(buffer);
  }

  @Post('matches/:id/participants/import')
  @RequirePermissions(Permission.GUILDWAR_IMPORT)
  @ApiOperation({ summary: 'Import participants from Excel' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  importParticipants(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() actor: { id: string; email: string },
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Excel file is required');
    }
    return this.guildWarService.importParticipants(id, file.buffer, actor);
  }
}
