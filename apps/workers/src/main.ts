import { loadEnv } from '@onecare/config';
import { createLogger } from '@onecare/telemetry';

/**
 * BullMQ consumers (ingestion, notifications, workflow timers) land in later milestones.
 * M0 provides a process boundary that boots with validated configuration.
 */
async function main() {
  const env = loadEnv();
  const logger = createLogger('workers', env.LOG_LEVEL);
  logger.info('Workers process started', {
    redisConfigured: Boolean(env.REDIS_URL),
    nodeEnv: env.NODE_ENV,
  });

  const shutdown = () => {
    logger.info('Workers shutting down');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Keep process alive for local `pnpm --filter @onecare/workers dev`
  await new Promise<void>(() => undefined);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
