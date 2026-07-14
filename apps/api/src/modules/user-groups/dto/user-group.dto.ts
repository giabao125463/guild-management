import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserGroupType } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CreateUserGroupDto {
  @ApiProperty({ example: 'Kim Lang Bắc' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ enum: UserGroupType, example: UserGroupType.KIM_LANG })
  @IsEnum(UserGroupType)
  type!: UserGroupType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateUserGroupDto extends PartialType(CreateUserGroupDto) {}

export class UserGroupQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: UserGroupType })
  @IsOptional()
  @IsEnum(UserGroupType)
  type?: UserGroupType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}

export class UserGroupOptionsQueryDto {
  @ApiPropertyOptional({ enum: UserGroupType })
  @IsOptional()
  @IsEnum(UserGroupType)
  type?: UserGroupType;
}
