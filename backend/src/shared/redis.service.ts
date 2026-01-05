import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType | null = null;
  private connected = false;

  constructor(private readonly config: ConfigService) {
    // Support multiple env var shapes (Railway may expose REDIS_PUBLIC_URL or REDIS_URL or REDISHOST)
    const publicUrl = this.config.get<string>('REDIS_PUBLIC_URL');
    const url = this.config.get<string>('REDIS_URL') || publicUrl;
    const host = this.config.get<string>('REDIS_HOST') || this.config.get<string>('REDISHOST');
    const port = this.config.get<string>('REDIS_PORT') || this.config.get<string>('REDISPORT');
    const password =
      this.config.get<string>('REDIS_PASSWORD') || this.config.get<string>('REDISPASSWORD');

    const connectionUrl =
      url ||
      (host
        ? `redis://${password ? `:${encodeURIComponent(password)}@` : ''}${host}${port ? `:${port}` : ''}`
        : undefined);

    if (!connectionUrl) {
      this.logger.warn('No REDIS_URL/REDIS_HOST configured — Redis disabled.');
      return;
    }

    try {
      // Log masked host for debugging without revealing password
      try {
        const parsed = new URL(connectionUrl);
        this.logger.log(`Attempting Redis connection to host=${parsed.hostname}${parsed.port ? `:${parsed.port}` : ''} (protocol=${parsed.protocol})`);
      } catch (e) {
        this.logger.log(`Attempting Redis connection to ${connectionUrl.replace(/:[^:@]+@/, ':*****@')}`);
      }

      const envForceTls = this.config.get<string>('REDIS_TLS') === 'true';
      const useTls = connectionUrl.startsWith('rediss:') || envForceTls;
      const connectTimeout = Number(this.config.get<number>('REDIS_CONNECT_TIMEOUT') || 10000);

      this.logger.log(`Redis TLS=${useTls} connectTimeout=${connectTimeout}ms`);

      this.client = createClient({
        url: connectionUrl,
        socket: {
          tls: useTls,
          // allow opt-out of cert verification via REDIS_TLS_REJECT_UNAUTHORIZED=false
          rejectUnauthorized: this.config.get<string>('REDIS_TLS_REJECT_UNAUTHORIZED') !== 'false',
          connectTimeout,
        },
      });
      this.client.on('error', (err) => {
        this.connected = false;
        this.logger.error('Redis client error', err as any);
      });
      this.client.on('connect', () => {
        this.connected = true;
        this.logger.log('Redis client connected');
      });
      // Connect but don't block constructor if it takes time
      this.client.connect().catch((err) => {
        this.logger.error('Failed to connect to Redis', err as any);
        this.client = null;
      });
    } catch (err) {
      this.logger.error('Failed to initialize Redis client', err as any);
      this.client = null;
    }
  }

  isAvailable(): boolean {
    return !!this.client && this.connected;
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    try {
      return await this.client.get(key);
    } catch (err) {
      this.logger.error('Redis get error', err as any);
      return null;
    }
  }

  async setEx(key: string, seconds: number, value: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.setEx(key, seconds, value);
    } catch (err) {
      this.logger.error('Redis setEx error', err as any);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.del(key);
    } catch (err) {
      this.logger.error('Redis del error', err as any);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.quit();
        this.logger.log('Redis client disconnected');
      } catch (err) {
        this.logger.error('Error during Redis quit', err as any);
      }
    }
  }
}
