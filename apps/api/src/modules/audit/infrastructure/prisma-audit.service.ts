import type { Prisma, PrismaClient } from '@onecare/database';
import { Inject, Injectable } from '@nestjs/common';
import { DOMAIN_EVENTS, type EventBusPort } from '@onecare/events';
import { APP_TOKENS } from '../../../shared/tokens';
import type { WriteAuditInput } from '../application/audit.types';

export type { WriteAuditInput } from '../application/audit.types';

export interface AuditPort {
  write(input: WriteAuditInput): Promise<void>;
}

@Injectable()
export class PrismaAuditService implements AuditPort {
  constructor(
    @Inject(APP_TOKENS.PRISMA) private readonly prisma: PrismaClient,
    @Inject(APP_TOKENS.EVENT_BUS) private readonly events: EventBusPort,
  ) {}

  async write(input: WriteAuditInput): Promise<void> {
    const row = await this.prisma.auditLog.create({
      data: {
        action: input.action,
        result: input.result,
        metadataJson: (input.metadata ?? {}) as Prisma.InputJsonValue,
        ...(input.tenantId !== undefined ? { tenantId: input.tenantId } : {}),
        ...(input.userId !== undefined ? { userId: input.userId } : {}),
        ...(input.sessionId !== undefined ? { sessionId: input.sessionId } : {}),
        ...(input.resource !== undefined ? { resource: input.resource } : {}),
        ...(input.resourceId !== undefined ? { resourceId: input.resourceId } : {}),
        ...(input.ip !== undefined ? { ip: input.ip } : {}),
        ...(input.userAgent !== undefined ? { userAgent: input.userAgent } : {}),
        ...(input.requestId !== undefined ? { requestId: input.requestId } : {}),
        ...(input.correlationId !== undefined ? { correlationId: input.correlationId } : {}),
      },
    });

    await this.events.publish({
      name: DOMAIN_EVENTS.AUDIT_WRITTEN,
      occurredAt: new Date(),
      payload: {
        auditId: row.id,
        action: input.action,
        result: input.result,
      },
      ...(input.tenantId !== undefined ? { tenantId: input.tenantId } : {}),
      ...(input.correlationId !== undefined ? { correlationId: input.correlationId } : {}),
    });
  }
}
