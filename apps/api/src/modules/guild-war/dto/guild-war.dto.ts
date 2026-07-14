import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CreateGuildWarDayDto {
  @ApiProperty({ example: '2024-06-08', description: 'Should be a Saturday' })
  @IsDateString()
  date!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ description: 'Allow non-Saturday dates when true' })
  @IsOptional()
  @IsBoolean()
  allowNonSaturday?: boolean;
}

export class UpdateGuildWarDayDto extends PartialType(CreateGuildWarDayDto) {}

export class CreateGuildWarMatchDto {
  @ApiProperty({ example: 'Match 1' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  order?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mvpMemberId?: string;
}

export class UpdateGuildWarMatchDto extends PartialType(
  CreateGuildWarMatchDto,
) {}

export class AddParticipantsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  memberIds!: string[];
}

export class AddParticipantsByNamesDto {
  @ApiProperty({ type: [String], example: ['Nguyễn Văn A', 'Trần Thị B'] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  names!: string[];
}

export class GuildWarQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;
}
