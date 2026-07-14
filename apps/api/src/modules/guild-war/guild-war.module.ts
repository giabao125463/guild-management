import { Module } from '@nestjs/common';
import { GuildWarService } from './guild-war.service';
import { GuildWarController } from './guild-war.controller';
import { GuildWarSchedulerService } from './guild-war.scheduler';
import { MembersModule } from '../members/members.module';

@Module({
  imports: [MembersModule],
  controllers: [GuildWarController],
  providers: [GuildWarService, GuildWarSchedulerService],
  exports: [GuildWarService],
})
export class GuildWarModule {}
