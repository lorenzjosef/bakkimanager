import 'reflect-metadata';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/http-exception.filter';

const DEFAULT_PORT = 4175;
const DEFAULT_GLOBAL_PREFIX = 'v1';

function resolveAllowedOrigins(): string[] | true {
  const envOrigins = process.env.BAKKI_ALLOWED_ORIGINS?.trim();
  if (envOrigins) {
    return envOrigins.split(',').map((origin) => origin.trim()).filter(Boolean);
  }

  // In development mode, allow any origin for convenience
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  // In production, require explicit origin configuration or fall back to common local ports
  return [
    'http://localhost:3000',
    'http://localhost:4173',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:4173',
    'http://127.0.0.1:5173',
  ];
}

export async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: {
      credentials: true,
      origin: resolveAllowedOrigins(),
    },
  });

  // Trust proxy for rate limiting behind load balancers
  if (process.env.BAKKI_TRUST_PROXY === 'true') {
    app.set('trust proxy', 1);
  }

  app.use(cookieParser());
  app.setGlobalPrefix(process.env.BAKKI_API_ROUTE_PREFIX?.trim() || DEFAULT_GLOBAL_PREFIX);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());

  const port = Number(process.env.PORT ?? DEFAULT_PORT);
  await app.listen(port, '0.0.0.0');

  return app;
}

void bootstrap();
