import {
  Controller,
  Get,
  Post,
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
import { GiveawayService } from './giveaway.service';
import { GenerateCandidatesDto, GiveawayQueryDto, RemoveGiveawayCandidatesDto } from './dto/giveaway.dto';

@ApiTags('Giveaway')
@ApiBearerAuth()
@Controller('giveaway')
export class GiveawayController {
  constructor(private readonly giveawayService: GiveawayService) {}

  @Get('candidates/template')
  @RequirePermissions(Permission.GIVEAWAY_WRITE)
  @ApiOperation({ summary: 'Tải mẫu Excel danh sách ứng viên vòng quay' })
  async downloadTemplate(@Res() res: Response) {
    const buffer = await this.giveawayService.buildCandidateTemplate();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="giveaway-candidates-template.xlsx"',
    );
    res.send(buffer);
  }

  @Post('days/:guildWarDayId/generate')
  @RequirePermissions(Permission.GIVEAWAY_WRITE)
  @ApiOperation({ summary: 'Tạo danh sách ứng viên vòng quay' })
  generate(
    @Param('guildWarDayId') guildWarDayId: string,
    @Body() dto: GenerateCandidatesDto,
    @CurrentUser() actor: { id: string; email: string },
  ) {
    return this.giveawayService.generateCandidates(guildWarDayId, dto, actor);
  }

  @Post('days/:guildWarDayId/generate/import')
  @RequirePermissions(Permission.GIVEAWAY_WRITE)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({
    summary: 'Import Excel tạo vòng quay tùy chỉnh (cột internalMemberId)',
  })
  generateImport(
    @Param('guildWarDayId') guildWarDayId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() actor: { id: string; email: string },
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Cần tải lên file Excel');
    }
    return this.giveawayService.generateFromExcel(
      guildWarDayId,
      file.buffer,
      actor,
    );
  }

  @Post(':id/spin')
  @RequirePermissions(Permission.GIVEAWAY_WRITE)
  @ApiOperation({ summary: 'Quay thưởng (backend chọn người thắng)' })
  spin(
    @Param('id') id: string,
    @CurrentUser() actor: { id: string; email: string },
  ) {
    return this.giveawayService.spin(id, actor);
  }

  @Post(':id/candidates/remove')
  @RequirePermissions(Permission.GIVEAWAY_WRITE)
  @ApiOperation({ summary: 'Loại thành viên khỏi vòng quay (chưa trúng giải)' })
  removeCandidates(
    @Param('id') id: string,
    @Body() dto: RemoveGiveawayCandidatesDto,
    @CurrentUser() actor: { id: string; email: string },
  ) {
    return this.giveawayService.removeCandidates(id, dto.memberIds, actor);
  }

  @Get('winners')
  @RequirePermissions(Permission.GIVEAWAY_READ)
  @ApiOperation({ summary: 'Danh sách người trúng giải (lọc theo giveawayId)' })
  listWinners(@Query() query: GiveawayQueryDto) {
    return this.giveawayService.listAllWinners(query);
  }

  @Get()
  @RequirePermissions(Permission.GIVEAWAY_READ)
  @ApiOperation({ summary: 'Lịch sử vòng quay' })
  findAll(@Query() query: GiveawayQueryDto) {
    return this.giveawayService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(Permission.GIVEAWAY_READ)
  @ApiOperation({ summary: 'Chi tiết vòng quay' })
  findOne(@Param('id') id: string) {
    return this.giveawayService.findOne(id);
  }
}
