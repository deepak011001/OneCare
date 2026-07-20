import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { loadEnv, parseCorsOrigins, isCookieSecure } from '@onecare/config';
import { createSafeLogger } from '@onecare/telemetry';
import { AppModule } from './app.module';

async function bootstrap() {
  const env = loadEnv();
  const logger = createSafeLogger('api', env.LOG_LEVEL);

  const app = await NestFactory.create(AppModule, {
    logger: false,
  });

  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: parseCorsOrigins(env.API_CORS_ORIGINS),
    credentials: true,
  });

  // CSRF strategy for cookie auth: SameSite=Lax + double-submit token header check on mutating auth routes
  app.use(
    (
      req: {
        method: string;
        path: string;
        cookies?: Record<string, string>;
        header: (name: string) => string | undefined;
      },
      res: { status: (code: number) => { json: (body: unknown) => void } },
      next: () => void,
    ) => {
      if (
        ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) &&
        req.path.startsWith('/v1/auth')
      ) {
        const cookieToken = req.cookies?.oc_csrf;
        const headerToken = req.header('x-csrf-token');
        if (cookieToken && headerToken !== cookieToken) {
          res.status(403).json({
            type: 'https://onecare.local/errors/csrf',
            title: 'CSRF validation failed',
            status: 403,
            detail: 'Missing or invalid CSRF token',
            code: 'CSRF_FAILED',
          });
          return;
        }
      }
      next();
    },
  );

  void isCookieSecure;

  await app.listen(env.API_PORT);
  logger.info('API listening', {
    port: env.API_PORT,
    authMode: env.AUTH_MODE,
    nodeEnv: env.NODE_ENV,
  });
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
