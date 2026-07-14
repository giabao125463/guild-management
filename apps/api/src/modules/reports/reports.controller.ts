import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Permission } from '@guild/shared-types';
import { RequirePermissions } from '../../common/decorators/auth.decorators';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @RequirePermissions(Permission.REPORT_READ)
  @ApiOperation({ summary: 'Dashboard statistics overview' })
  getDashboard() {
    return this.reportsService.getDashboardStats();
  }

  @Get('class-distribution')
  @RequirePermissions(Permission.REPORT_READ)
  @ApiOperation({ summary: 'Member class distribution' })
  getClassDistribution() {
    return this.reportsService.getClassDistribution();
  }

  @Get('attendance-ranking')
  @RequirePermissions(Permission.REPORT_READ)
  @ApiOperation({ summary: 'Guild war attendance ranking' })
  getAttendanceRanking(@Query('limit') limit?: number) {
    return this.reportsService.getAttendanceRanking(Number(limit) || 20);
  }

  @Get('top-mvp')
  @RequirePermissions(Permission.REPORT_READ)
  @ApiOperation({ summary: 'Top MVP members' })
  getTopMvp(@Query('limit') limit?: number) {
    return this.reportsService.getTopMvp(Number(limit) || 20);
  }

  @Get('top-giveaway-winners')
  @RequirePermissions(Permission.REPORT_READ)
  @ApiOperation({ summary: 'Top giveaway winners' })
  getTopGiveawayWinners(@Query('limit') limit?: number) {
    return this.reportsService.getTopGiveawayWinners(Number(limit) || 20);
  }

  @Get('contribution-ranking')
  @RequirePermissions(Permission.REPORT_READ)
  @ApiOperation({ summary: 'Contribution point ranking' })
  getContributionRanking(@Query('limit') limit?: number) {
    return this.reportsService.getContributionRanking(Number(limit) || 20);
  }
}
