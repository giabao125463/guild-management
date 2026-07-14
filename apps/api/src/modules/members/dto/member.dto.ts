import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GameClass, UserGroupType } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CreateMemberDto {
  @ApiProperty({ example: 'M001' })
  @IsString()
  @MinLength(1)
  internalMemberId!: string;

  @ApiProperty({ example: 'Long Ngâm Pro' })
  @IsString()
  @MinLength(1)
  currentName!: string;

  @ApiProperty({ enum: GameClass, example: GameClass.LONG_NGAM })
  @IsEnum(GameClass)
  currentClass!: GameClass;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  joinDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  leaveDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isBlacklisted?: boolean;

  @ApiPropertyOptional({ description: 'Kim Lang user group id (null to clear)' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  kimLangUserGroupId?: string | null;

  @ApiPropertyOptional({ description: 'Team user group id (null to clear)' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  teamUserGroupId?: string | null;

  @ApiPropertyOptional({ description: 'Tình duyên user group id (null to clear)' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  tinhDuyenUserGroupId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  relationship?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  realLifeRelationship?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  contributionPoint?: number;
}

export class UpdateMemberDto extends PartialType(CreateMemberDto) {}

export class BatchCreateMembersDto {
  @ApiProperty({ type: [CreateMemberDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMemberDto)
  members!: CreateMemberDto[];
}

export class MemberQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: GameClass })
  @IsOptional()
  @IsEnum(GameClass)
  currentClass?: GameClass;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isBlacklisted?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ enum: UserGroupType })
  @IsOptional()
  @IsEnum(UserGroupType)
  userGroupType?: UserGroupType;

  @ApiPropertyOptional({
    description: 'Filter by user group id, or "none" for unassigned in userGroupType',
  })
  @IsOptional()
  @IsString()
  userGroupId?: string;
}
