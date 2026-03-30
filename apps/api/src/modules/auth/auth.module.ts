import { Module, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { OdooModule } from '../../odoo/odoo.module';
import { AuditModule } from '../audit/audit.module';
import { AuthController } from './auth.controller';
import { AuthService, SESSION_STORE_TOKEN } from './auth.service';
import { MemorySessionStore, RedisSessionStore, type SessionStore } from '../../common/session';

const logger = new Logger('SessionStore');

function createSessionStore(): SessionStore {
  const redisUrl = process.env.BAKKI_REDIS_URL?.trim();

  if (redisUrl) {
    try {
      const redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => Math.min(times * 100, 3000),
        enableReadyCheck: true,
        lazyConnect: false,
      });

      redis.on('error', (err) => {
        logger.error(`Redis connection error: ${err.message}`);
      });

      redis.on('connect', () => {
        logger.log('Redis session store connected');
      });

      return new RedisSessionStore(redis);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Redis error';
      logger.warn(`Failed to connect to Redis, falling back to memory store: ${message}`);
    }
  }

  if (process.env.NODE_ENV === 'production') {
    logger.warn('Using in-memory session store in production. Sessions will be lost on restart.');
  }

  return new MemorySessionStore();
}

@Module({
  imports: [AuditModule, OdooModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: SESSION_STORE_TOKEN,
      useFactory: createSessionStore,
    },
  ],
  exports: [AuthService, SESSION_STORE_TOKEN],
})
export class AuthModule {}
