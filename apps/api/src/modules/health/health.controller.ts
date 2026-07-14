import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/auth.decorators';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Health check (public)' })
  async check() {
    let database = 'ok';
    let redis = 'ok';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'error';
    }

    try {
      await this.redis.set('health:ping', '1', 5);
      const val = await this.redis.get('health:ping');
      if (val !== '1') redis = 'error';
    } catch {
      redis = 'error';
    }

    const status = database === 'ok' && redis === 'ok' ? 'ok' : 'degraded';

    return {
      status,
      timestamp: new Date().toISOString(),
      services: { database, redis },
    };
  }
}
