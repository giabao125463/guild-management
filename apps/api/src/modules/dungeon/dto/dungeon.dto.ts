import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DungeonStatus, GameClass } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CreateDungeonScheduleDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsDateString()
  scheduledAt!: string;

  @ApiProperty({ example: 6 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxPlayers!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  leaderId?: string;

  @ApiPropertyOptional({ enum: GameClass, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(GameClass, { each: true })
  requiredClasses?: GameClass[];
}

export class UpdateDungeonScheduleDto extends PartialType(
  CreateDungeonScheduleDto,
) {
  @ApiPropertyOptional({ enum: DungeonStatus })
  @IsOptional()
  @IsEnum(DungeonStatus)
  status?: DungeonStatus;
}

export class RegisterDungeonDto {
  @ApiProperty()
  @IsString()
  memberId!: string;
}

export class DungeonQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: DungeonStatus })
  @IsOptional()
  @IsEnum(DungeonStatus)
  status?: DungeonStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;
}
