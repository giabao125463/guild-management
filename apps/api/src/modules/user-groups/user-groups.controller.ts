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
import { UserGroupsService } from './user-groups.service';
import {
  CreateUserGroupDto,
  UpdateUserGroupDto,
  UserGroupOptionsQueryDto,
  UserGroupQueryDto,
} from './dto/user-group.dto';

@ApiTags('User Groups')
@ApiBearerAuth()
@Controller('user-groups')
export class UserGroupsController {
  constructor(private readonly userGroupsService: UserGroupsService) {}

  @Post()
  @RequirePermissions(Permission.USER_GROUP_WRITE)
  @ApiOperation({ summary: 'Create user group value' })
  create(
    @Body() dto: CreateUserGroupDto,
    @CurrentUser() actor: { id: string; email: string },
  ) {
    return this.userGroupsService.create(dto, actor);
  }

  @Get()
  @RequirePermissions(Permission.USER_GROUP_READ)
  @ApiOperation({ summary: 'List user groups' })
  findAll(@Query() query: UserGroupQueryDto) {
    return this.userGroupsService.findAll(query);
  }

  @Get('options')
  @RequirePermissions(Permission.MEMBER_READ)
  @ApiOperation({ summary: 'Active user groups for member filters/forms' })
  findOptions(@Query() query: UserGroupOptionsQueryDto) {
    return this.userGroupsService.findOptions(query.type);
  }

  @Get(':id')
  @RequirePermissions(Permission.USER_GROUP_READ)
  @ApiOperation({ summary: 'Get user group by id' })
  findOne(@Param('id') id: string) {
    return this.userGroupsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.USER_GROUP_WRITE)
  @ApiOperation({ summary: 'Update user group' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserGroupDto,
    @CurrentUser() actor: { id: string; email: string },
  ) {
    return this.userGroupsService.update(id, dto, actor);
  }

  @Delete(':id')
  @RequirePermissions(Permission.USER_GROUP_DELETE)
  @ApiOperation({ summary: 'Soft delete user group' })
  remove(
    @Param('id') id: string,
    @CurrentUser() actor: { id: string; email: string },
  ) {
    return this.userGroupsService.remove(id, actor);
  }
}
