import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Permission } from '@guild/shared-types';
import {
  RequirePermissions,
  CurrentUser,
} from '../../common/decorators/auth.decorators';
import { DungeonService } from './dungeon.service';
import {
  CreateDungeonScheduleDto,
  DungeonQueryDto,
  RegisterDungeonDto,
  UpdateDungeonScheduleDto,
} from './dto/dungeon.dto';

@ApiTags('Dungeon')
@ApiBearerAuth()
@Controller('dungeon')
export class DungeonController {
  constructor(private readonly dungeonService: DungeonService) {}

  @Get()
  @RequirePermissions(Permission.DUNGEON_READ)
  @ApiOperation({ summary: 'List dungeon schedules (read access)' })
  findAll(@Query() query: DungeonQueryDto) {
    return this.dungeonService.findAll(query);
  }

  @Get('statistics')
  @RequirePermissions(Permission.DUNGEON_READ)
  @ApiOperation({ summary: 'Dungeon statistics' })
  getStatistics() {
    return this.dungeonService.getStatistics();
  }

  @Get(':id')
  @RequirePermissions(Permission.DUNGEON_READ)
  @ApiOperation({ summary: 'Get dungeon schedule detail' })
  findOne(@Param('id') id: string) {
    return this.dungeonService.findOne(id);
  }

  @Post()
  @RequirePermissions(Permission.DUNGEON_WRITE)
  @ApiOperation({ summary: 'Create dungeon schedule' })
  create(
    @Body() dto: CreateDungeonScheduleDto,
    @CurrentUser() actor: { id: string; email: string },
  ) {
    return this.dungeonService.create(dto, actor);
  }

  @Patch(':id')
  @RequirePermissions(Permission.DUNGEON_WRITE)
  @ApiOperation({ summary: 'Update dungeon schedule' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDungeonScheduleDto,
    @CurrentUser() actor: { id: string; email: string },
  ) {
    return this.dungeonService.update(id, dto, actor);
  }

  @Delete(':id')
  @RequirePermissions(Permission.DUNGEON_DELETE)
  @ApiOperation({ summary: 'Soft delete dungeon schedule' })
  remove(
    @Param('id') id: string,
    @CurrentUser() actor: { id: string; email: string },
  ) {
    return this.dungeonService.remove(id, actor);
  }

  @Post(':id/register')
  @RequirePermissions(Permission.DUNGEON_WRITE)
  @ApiOperation({ summary: 'Register member for dungeon' })
  register(
    @Param('id') id: string,
    @Body() dto: RegisterDungeonDto,
    @CurrentUser() actor: { id: string; email: string },
  ) {
    return this.dungeonService.register(id, dto, actor);
  }

  @Post(':id/cancel-registration')
  @RequirePermissions(Permission.DUNGEON_WRITE)
  @ApiOperation({ summary: 'Cancel dungeon registration' })
  cancelRegistration(
    @Param('id') id: string,
    @Body() dto: RegisterDungeonDto,
    @CurrentUser() actor: { id: string; email: string },
  ) {
    return this.dungeonService.cancelRegistration(id, dto.memberId, actor);
  }
}
