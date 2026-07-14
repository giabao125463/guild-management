import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  ArrayMinSize,
  ValidateIf,
} from 'class-validator';
import { GiveawayFilterType } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class GenerateCandidatesDto {
  @ApiProperty({ enum: GiveawayFilterType })
  @IsEnum(GiveawayFilterType)
  filterType!: GiveawayFilterType;

  @ApiPropertyOptional({
    type: [String],
    description: 'Member IDs (cuid) — dùng khi filterType = CUSTOM',
  })
  @ValidateIf(
    (o: GenerateCandidatesDto) =>
      o.filterType === GiveawayFilterType.CUSTOM &&
      !o.internalMemberIds?.length,
  )
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  memberIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Mã thành viên nội bộ — dùng khi filterType = CUSTOM',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  internalMemberIds?: string[];
}

export class RemoveGiveawayCandidatesDto {
  @ApiProperty({ type: [String], description: 'Member IDs (cuid) cần loại khỏi vòng quay' })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  memberIds!: string[];
}

export class GiveawayQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  guildWarDayId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  giveawayId?: string;
}
