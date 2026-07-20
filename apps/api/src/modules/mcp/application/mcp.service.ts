import { Inject, Injectable } from '@nestjs/common';
import type { EventBusPort } from '@onecare/events';
import { DOMAIN_EVENTS } from '@onecare/events';
import type { McpGatewayService } from '@onecare/mcp';
import type { RequestContext } from '@onecare/shared';
import { AUDIT_ACTIONS, DomainError, NotFoundError } from '@onecare/shared';
import { redactPii } from '@onecare/telemetry';
import { APP_TOKENS } from '../../../shared/tokens';
import type { AuditPort } from '../../audit/infrastructure/prisma-audit.service';
import type { McpPlatform } from '@onecare/mcp';
import { MCP_TOKENS } from '../mcp.tokens';

@Injectable()
export class McpService {
  constructor(
    @Inject(MCP_TOKENS.PLATFORM) private readonly platform: McpPlatform,
    @Inject(APP_TOKENS.EVENT_BUS) private readonly events: EventBusPort,
    @Inject(APP_TOKENS.AUDIT_PORT) private readonly audit: AuditPort,
  ) {}

  private get gateway(): McpGatewayService {
    return this.platform.gateway;
  }

  listConnectors() {
    return this.gateway.listConnectors();
  }

  getConnector(id: string) {
    const connector = this.gateway.getConnector(id);
    if (!connector) {
      throw new NotFoundError('Connector');
    }
    return connector;
  }

  listTools(connectorId?: string) {
    return this.gateway.listTools(connectorId);
  }

  async health() {
    return this.gateway.healthSummary();
  }

  async execute(input: {
    context: RequestContext;
    connectorId: string;
    toolName: string;
    arguments: Readonly<Record<string, unknown>>;
    confirmationId?: string;
    idempotencyKey?: string;
  }) {
    if (!input.context.permissions.includes('mcp.execute')) {
      throw new DomainError('FORBIDDEN', 'Missing mcp.execute permission');
    }

    let confirmationApproved = false;
    if (input.confirmationId) {
      const confirmation = await this.platform.confirmations.get(
        input.context.tenantId,
        input.confirmationId,
      );
      if (!confirmation || confirmation.status !== 'approved') {
        throw new DomainError('VALIDATION', 'Confirmation must be approved before execution');
      }
      if (String(confirmation.userId) !== String(input.context.userId)) {
        throw new DomainError('FORBIDDEN', 'Confirmation does not belong to this user');
      }
      confirmationApproved = true;
    }

    const tool = this.gateway.listTools(input.connectorId).find((t) => t.name === input.toolName);
    if (!tool) {
      throw new NotFoundError('Tool');
    }

    const policy = this.platform.policies.evaluate({
      tenantId: input.context.tenantId,
      userId: input.context.userId,
      toolName: input.toolName,
      connectorId: input.connectorId,
      permissions: input.context.permissions,
      requiredPermissions: tool.permissions,
      confirmationRequired: tool.confirmationRequired,
      confirmationApproved,
    });

    if (policy.decision === 'deny') {
      await this.audit.write({
        tenantId: String(input.context.tenantId),
        userId: String(input.context.userId),
        sessionId: String(input.context.sessionId),
        action: AUDIT_ACTIONS.MCP_TOOL_EXECUTE,
        resource: `mcp.tool.${input.toolName}`,
        resourceId: input.connectorId,
        result: 'denied',
        correlationId: String(input.context.correlationId),
        requestId: String(input.context.requestId),
        metadata: { reasons: policy.reasons },
      });
      throw new DomainError('FORBIDDEN', policy.reasons.join('; ') || 'Execution denied');
    }

    if (policy.decision === 'require_confirmation') {
      throw new DomainError('CONFIRMATION_REQUIRED', 'User confirmation is required');
    }

    const result = await this.gateway.execute({
      connectorId: input.connectorId,
      toolName: input.toolName,
      arguments: input.arguments,
      context: {
        tenantId: input.context.tenantId,
        userId: input.context.userId,
        correlationId: input.context.correlationId,
        roles: input.context.roles,
        permissions: input.context.permissions,
        attributes: input.context.attributes,
      },
      ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
    });

    await this.events.publish({
      name: DOMAIN_EVENTS.MCP_TOOL_EXECUTED,
      occurredAt: new Date(),
      tenantId: String(input.context.tenantId),
      correlationId: String(input.context.correlationId),
      payload: {
        connectorId: input.connectorId,
        toolName: input.toolName,
        ok: result.ok,
        latencyMs: result.latencyMs,
        errorCode: result.errorCode ?? null,
      },
    });

    await this.audit.write({
      tenantId: String(input.context.tenantId),
      userId: String(input.context.userId),
      sessionId: String(input.context.sessionId),
      action: AUDIT_ACTIONS.MCP_TOOL_EXECUTE,
      resource: `mcp.tool.${input.toolName}`,
      resourceId: input.connectorId,
      result: result.ok ? 'success' : 'failure',
      correlationId: String(input.context.correlationId),
      requestId: String(input.context.requestId),
      metadata: {
        arguments: redactPii(maskToolArgs(input.arguments)),
        errorCode: result.errorCode ?? null,
      },
    });

    return result;
  }

  async approveConfirmation(context: RequestContext, confirmationId: string) {
    const approved = await this.platform.confirmations.approve(
      context.tenantId,
      confirmationId,
      context.userId,
    );
    if (!approved) {
      throw new NotFoundError('Confirmation');
    }
    return approved;
  }

  async cancelConfirmation(context: RequestContext, confirmationId: string) {
    const cancelled = await this.platform.confirmations.cancel(
      context.tenantId,
      confirmationId,
      context.userId,
    );
    if (!cancelled) {
      throw new NotFoundError('Confirmation');
    }
    return cancelled;
  }
}

function maskToolArgs(args: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const masked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (/token|secret|password|authorization/i.test(key)) {
      masked[key] = '[REDACTED]';
    } else {
      masked[key] = value;
    }
  }
  return masked;
}
