import { Module } from '@nestjs/common';
import { GiveawayService } from './giveaway.service';
import { GiveawayController } from './giveaway.controller';
import { MembersModule } from '../members/members.module';

@Module({
  imports: [MembersModule],
  controllers: [GiveawayController],
  providers: [GiveawayService],
  exports: [GiveawayService],
})
export class GiveawayModule {}
