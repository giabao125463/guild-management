import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  ArrayUnique,
} from 'class-validator';
import { ALL_PERMISSIONS } from '@guild/shared-types';

export class CreateUserDto {
  @ApiProperty({ example: 'user@guild.local' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Nguyen Van A' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'Password@123' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({
    type: [String],
    example: ['member.read', 'member.write'],
    enum: ALL_PERMISSIONS,
    isArray: true,
  })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissions!: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'NewPassword@123' })
  @IsString()
  @MinLength(6)
  newPassword!: string;
}
