import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GuildWarService } from './guild-war.service';

@Injectable()
export class GuildWarSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(GuildWarSchedulerService.name);

  constructor(
    private readonly guildWarService: GuildWarService,
    private readonly config: ConfigService,
  ) {}

  private isEnabled() {
    return this.config.get<string>('GUILD_WAR_AUTO_SCHEDULE_ENABLED', 'true') !== 'false';
  }

  private weeksAhead() {
    const raw = this.config.get<string>('GUILD_WAR_AUTO_SCHEDULE_WEEKS_AHEAD', '4');
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 4;
  }

  async runSchedule(reason: string) {
    if (!this.isEnabled()) {
      this.logger.debug(`Auto schedule skipped (${reason}): disabled`);
      return { created: 0, skipped: 0, dates: [] as string[] };
    }

    const result = await this.guildWarService.ensureSaturdaySchedule(this.weeksAhead());
    if (result.created > 0) {
      this.logger.log(
        `Auto-created ${result.created} guild war day(s) (${reason}): ${result.dates.join(', ')}`,
      );
    } else {
      this.logger.debug(`Auto schedule (${reason}): nothing to create (${result.skipped} exist)`);
    }
    return result;
  }

  onModuleInit() {
    void this.runSchedule('startup');
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  handleDailySchedule() {
    void this.runSchedule('daily-cron');
  }
}
