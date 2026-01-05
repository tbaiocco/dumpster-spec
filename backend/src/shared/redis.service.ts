import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';
import * as dns from 'dns';
import * as net from 'net';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType<any, any, any> | null = null;
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
      // Perform a quick network probe (DNS + TCP) to provide clearer logs for connectivity issues
      (async () => {
        try {
          const parsed = new URL(connectionUrl);
          const host = parsed.hostname;
          const port = Number(parsed.port) || 6379;

          this.logger.log(`Probing DNS for ${host}...`);
          try {
            const lookup = await dns.promises.lookup(host);
            this.logger.log(`DNS lookup ok: ${host} -> ${lookup.address}`);
          } catch (dnsErr) {
            this.logger.error(`DNS lookup failed for ${host}: ${dnsErr}`);
          }

          this.logger.log(`Attempting TCP connect to ${host}:${port} (timeout 5000ms)...`);
          await new Promise<void>((resolve, reject) => {
            const socket = net.createConnection({ host, port }, () => {
              socket.destroy();
              this.logger.log(`TCP connect OK to ${host}:${port}`);
              resolve();
            });
            socket.setTimeout(5000, () => {
              socket.destroy();
              reject(new Error('TCP connect timeout'));
            });
            socket.on('error', (err) => {
              socket.destroy();
              reject(err);
            });
          }).catch((err) => {
            this.logger.error(`Pre-connect TCP check failed: ${err}`);
          });
        } catch (probeErr) {
          this.logger.error('Network probe failed', probeErr as any);
        }
      })();

      const envForceTls = this.config.get<string>('REDIS_TLS') === 'true';
      const connectTimeout = Number(this.config.get<number>('REDIS_CONNECT_TIMEOUT') || 10000);

      this.logger.log(`Redis connectTimeout=${connectTimeout}ms (TLS forced=${envForceTls})`);

      // Non-blocking async connect flow that tries multiple candidate endpoints and auth modes.
      (async () => {
        const tryConnect = async (urlToUse: string, tlsForced: boolean) => {
          // Determine TLS per-URL
          const useTlsForThis = urlToUse.startsWith('rediss:') || tlsForced;
          const c = createClient({
            url: urlToUse,
            socket: {
              tls: useTlsForThis,
              rejectUnauthorized:
                this.config.get<string>('REDIS_TLS_REJECT_UNAUTHORIZED') !== 'false',
              connectTimeout,
            },
          });

          c.on('error', (err) => {
            this.connected = false;
            this.logger.error('Redis client error', err as any);
          });
          c.on('connect', () => {
            this.connected = true;
            this.logger.log('Redis client connected');
          });

          try {
            await c.connect();
            this.client = c;
            return { ok: true } as const;
          } catch (e) {
            try {
              await c.quit();
            } catch (_) {}
            return { ok: false, err: e as Error } as const;
          }
        };

        // Build ordered list of candidate URLs to try
        const candidates: Array<{ url: string; reason: string }>
          = [];

        // Helper to detect unexpanded Railway placeholders like ${{...}}
        const looksUnexpanded = (s?: string) => !s || s.includes('${{');

        // Prefer explicit host/port/user/password if provided (backend service envs)
        const beHost = this.config.get<string>('REDIS_HOST') || this.config.get<string>('REDISHOST');
        const bePort = this.config.get<string>('REDIS_PORT') || this.config.get<string>('REDISPORT');
        const beUser = this.config.get<string>('REDIS_USER') || this.config.get<string>('REDISUSER');
        const bePassword = this.config.get<string>('REDIS_PASSWORD') || this.config.get<string>('REDISPASSWORD');

        if (beHost && !looksUnexpanded(beHost)) {
          const portPart = bePort ? `:${bePort}` : '';
          if (beUser && bePassword && !looksUnexpanded(bePassword) && !looksUnexpanded(beUser)) {
            candidates.push({ url: `redis://${encodeURIComponent(beUser)}:${encodeURIComponent(bePassword)}@${beHost}${portPart}`, reason: 'backend env user+pass' });
          }
          if (bePassword && !looksUnexpanded(bePassword)) {
            candidates.push({ url: `redis://${bePassword ? `:${encodeURIComponent(bePassword)}@` : ''}${beHost}${portPart}`, reason: 'backend env password-only' });
          }
        }

        // If we have any explicit URL envs, prefer them next
        if (url && !looksUnexpanded(url)) {
          candidates.push({ url, reason: 'REDIS_URL' });
        }
        const publicUrl = this.config.get<string>('REDIS_PUBLIC_URL');
        if (publicUrl && !looksUnexpanded(publicUrl)) {
          candidates.push({ url: publicUrl, reason: 'REDIS_PUBLIC_URL (proxy)' });
        }

        // Also include the pre-computed connectionUrl if it's different
        if (connectionUrl && !candidates.some(c => c.url === connectionUrl) && !looksUnexpanded(connectionUrl)) {
          candidates.push({ url: connectionUrl, reason: 'constructed connectionUrl' });
        }

        if (candidates.length === 0) {
          this.logger.warn('No usable Redis endpoints found (envs may contain placeholders or be empty).');
          return;
        }

        // Attempt each candidate in order; on WRONGPASS try password-only fallback for same host
        for (const cand of candidates) {
          try {
            this.logger.log(`Trying Redis candidate (${cand.reason}): ${cand.url.replace(/:[^:@]+@/, ':*****@')}`);
            const res = await tryConnect(cand.url, envForceTls);
            if (res.ok) {
              this.logger.log(`Connected to Redis (${cand.reason})`);
              return;
            }

            // If auth error, attempt username-less fallback for host:port
            const errMsg = (res.err && res.err.message) ? String(res.err.message) : '';
            if (/WRONGPASS|invalid username-password|NOAUTH|ERR invalid password/i.test(errMsg)) {
              try {
                const parsed = new URL(cand.url);
                const host = parsed.hostname;
                const port = parsed.port ? `:${parsed.port}` : '';
                const pass = parsed.password || '';
                if (pass) {
                  const fallback = `redis://${pass ? `:${encodeURIComponent(pass)}@` : ''}${host}${port}`;
                  this.logger.log('Auth failed — attempting password-only fallback for same host');
                  const fbRes = await tryConnect(fallback, envForceTls);
                  if (fbRes.ok) {
                    this.logger.log('Redis connected with password-only fallback');
                    return;
                  }
                  this.logger.error('Password-only fallback failed', fbRes.err as any);
                }
              } catch (parseErr) {
                this.logger.error('Failed to parse candidate URL for auth fallback', parseErr as any);
              }
            }

            this.logger.error(`Candidate failed (${cand.reason})`, res.err as any);
          } catch (outer) {
            this.logger.error('Unexpected error during Redis connect attempts', outer as any);
          }
        }

        this.logger.error('All Redis connection candidates failed; Redis disabled for this run.');
        this.client = null;
      })();
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

  async ping(): Promise<boolean> {
    if (!this.client) return false;
    try {
      const res = await (this.client as any).ping();
      // redis returns 'PONG' on success
      return res === 'PONG' || res === 'OK' || !!res;
    } catch (err) {
      this.logger.error('Redis ping error', err as any);
      return false;
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
