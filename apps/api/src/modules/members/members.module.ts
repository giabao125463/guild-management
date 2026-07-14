import { Module } from '@nestjs/common';
import { MembersService } from './members.service';
import { MembersController } from './members.controller';
import { ExcelService } from './excel.service';

@Module({
  controllers: [MembersController],
  providers: [MembersService, ExcelService],
  exports: [MembersService, ExcelService],
})
export class MembersModule {}
