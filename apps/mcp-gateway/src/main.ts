import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { loadEnv } from '@onecare/config';
import { createLogger } from '@onecare/telemetry';
import { AppModule } from './app.module';

async function bootstrap() {
  const env = loadEnv();
  const logger = createLogger('mcp-gateway', env.LOG_LEVEL);
  const app = await NestFactory.create(AppModule, { logger: false });
  await app.listen(env.MCP_GATEWAY_PORT);
  logger.info('MCP gateway listening', { port: env.MCP_GATEWAY_PORT });
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
