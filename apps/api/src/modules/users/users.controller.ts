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
import { PaginationDto } from '../../common/dto/pagination.dto';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, ResetPasswordDto } from './dto/user.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RequirePermissions(Permission.USER_WRITE)
  @ApiOperation({ summary: 'Create user' })
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser() actor: { id: string; email: string },
  ) {
    return this.usersService.create(dto, actor);
  }

  @Get()
  @RequirePermissions(Permission.USER_READ)
  @ApiOperation({ summary: 'List users' })
  findAll(@Query() query: PaginationDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(Permission.USER_READ)
  @ApiOperation({ summary: 'Get user by id' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.USER_WRITE)
  @ApiOperation({ summary: 'Update user' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: { id: string; email: string },
  ) {
    return this.usersService.update(id, dto, actor);
  }

  @Delete(':id')
  @RequirePermissions(Permission.USER_DELETE)
  @ApiOperation({ summary: 'Soft delete user' })
  remove(
    @Param('id') id: string,
    @CurrentUser() actor: { id: string; email: string },
  ) {
    return this.usersService.remove(id, actor);
  }

  @Post(':id/reset-password')
  @RequirePermissions(Permission.USER_WRITE)
  @ApiOperation({ summary: 'Reset user password' })
  resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
    @CurrentUser() actor: { id: string; email: string },
  ) {
    return this.usersService.resetPassword(id, dto.newPassword, actor);
  }
}
