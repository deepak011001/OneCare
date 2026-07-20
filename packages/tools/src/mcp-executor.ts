import type { McpGatewayService } from '@onecare/mcp';
import type { PolicyEngine } from '@onecare/policies';
import type { ConfirmationStorePort, CreateConfirmationInput } from '@onecare/confirmations';
import { buildConfirmationSummary } from '@onecare/confirmations';
import type {
  ToolExecutorPort,
  ToolExecutionInput,
  ToolExecutionResult,
  ToolRegistryPort,
} from './types';

export interface McpToolExecutorDeps {
  readonly gateway: McpGatewayService;
  readonly tools: ToolRegistryPort;
  readonly policies: PolicyEngine;
  readonly confirmations: ConfirmationStorePort;
}

export class McpToolExecutor implements ToolExecutorPort {
  constructor(private readonly deps: McpToolExecutorDeps) {}

  async execute(input: ToolExecutionInput): Promise<ToolExecutionResult> {
    const tool = this.deps.tools.get(input.toolName);
    if (!tool || !tool.implemented) {
      return {
        ok: false,
        decision: 'denied',
        errorCode: 'TOOL_NOT_IMPLEMENTED',
        errorMessage: 'Tool is not available for execution',
      };
    }

    const policy = this.deps.policies.evaluate({
      tenantId: input.context.tenantId,
      userId: input.context.userId,
      toolName: input.toolName,
      connectorId: input.connectorId,
      permissions: input.context.permissions ?? [],
      requiredPermissions: tool.permissions,
      confirmationRequired: tool.confirmationRequired,
      confirmationApproved: Boolean(input.confirmationApproved),
    });

    if (policy.decision === 'deny') {
      return {
        ok: false,
        decision: 'denied',
        errorCode: 'POLICY_DENIED',
        errorMessage: policy.reasons.join('; ') || 'Execution denied by policy',
      };
    }

    if (policy.decision === 'require_confirmation') {
      const confirmationInput: CreateConfirmationInput = {
        tenantId: input.context.tenantId,
        userId: input.context.userId,
        connectorId: input.connectorId,
        toolName: input.toolName,
        arguments: input.arguments,
        summary: buildConfirmationSummary(input.toolName, input.arguments),
      };
      const confirmation = await this.deps.confirmations.create(confirmationInput);
      return {
        ok: false,
        decision: 'confirmation_required',
        confirmationId: confirmation.id,
        errorMessage: confirmation.summary,
      };
    }

    const result = await this.deps.gateway.execute({
      connectorId: input.connectorId,
      toolName: input.toolName,
      arguments: input.arguments,
      context: input.context,
    });

    return {
      ok: result.ok,
      decision: 'executed',
      ...(result.data !== undefined ? { data: result.data } : {}),
      ...(result.errorCode ? { errorCode: result.errorCode } : {}),
      ...(result.errorMessage ? { errorMessage: result.errorMessage } : {}),
      latencyMs: result.latencyMs,
    };
  }
}
