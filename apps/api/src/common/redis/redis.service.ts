import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;
  private readonly memoryFallback = new Map<
    string,
    { value: string; expiresAt?: number }
  >();
  private useMemory = false;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('REDIS_URL', 'redis://localhost:6379');
    const useTls = url.startsWith('rediss://');
    this.client = new Redis(url, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableOfflineQueue: false,
      ...(useTls ? { tls: {} } : {}),
      retryStrategy: (times) =>
        times > 3 ? null : Math.min(times * 200, 1000),
    });

    this.client.on('error', (err) => {
      this.logger.warn(`Redis error, falling back to memory: ${err.message}`);
      this.useMemory = true;
    });

    this.client
      .connect()
      .then(() => {
        this.useMemory = false;
        this.logger.log('Connected to Redis');
      })
      .catch((err: Error) => {
        this.logger.warn(
          `Redis unavailable, using memory store: ${err.message}`,
        );
        this.useMemory = true;
      });
  }

  async onModuleDestroy() {
    if (!this.useMemory) {
      await this.client.quit().catch(() => undefined);
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.useMemory) {
      const entry = this.memoryFallback.get(key);
      if (!entry) return null;
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        this.memoryFallback.delete(key);
        return null;
      }
      return entry.value;
    }
    try {
      return await this.client.get(key);
    } catch {
      this.useMemory = true;
      return this.get(key);
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.useMemory) {
      this.memoryFallback.set(key, {
        value,
        expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
      });
      return;
    }
    try {
      if (ttlSeconds) {
        await this.client.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
    } catch {
      this.useMemory = true;
      await this.set(key, value, ttlSeconds);
    }
  }

  async del(key: string): Promise<void> {
    if (this.useMemory) {
      this.memoryFallback.delete(key);
      return;
    }
    try {
      await this.client.del(key);
    } catch {
      this.useMemory = true;
      await this.del(key);
    }
  }

  async incr(key: string): Promise<number> {
    if (this.useMemory) {
      const current = Number((await this.get(key)) ?? '0') + 1;
      await this.set(key, String(current));
      return current;
    }
    try {
      return await this.client.incr(key);
    } catch {
      this.useMemory = true;
      return this.incr(key);
    }
  }
}
