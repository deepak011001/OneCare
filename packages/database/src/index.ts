import { PrismaClient } from '@prisma/client';

export { PrismaClient } from '@prisma/client';
export type * from '@prisma/client';

export const DATABASE_PACKAGE = '@onecare/database' as const;

export interface HealthCheckPort {
  ping(): Promise<{ ok: true } | { ok: false; error: string }>;
}

export function createPrismaClient(datasourceUrl?: string): PrismaClient {
  return new PrismaClient(
    datasourceUrl
      ? {
          datasources: {
            db: { url: datasourceUrl },
          },
        }
      : undefined,
  );
}

export class PrismaHealthCheck implements HealthCheckPort {
  constructor(private readonly prisma: PrismaClient) {}

  async ping(): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'database_unreachable',
      };
    }
  }
}

export function featureFlagLookupKey(
  scope: 'system' | 'tenant' | 'user',
  key: string,
  id?: string,
): string {
  if (scope === 'system') {
    return `system:${key}`;
  }
  if (!id) {
    throw new Error(`id required for feature flag scope ${scope}`);
  }
  return `${scope}:${id}:${key}`;
}
