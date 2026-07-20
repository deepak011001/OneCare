import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { PERMISSIONS } from '@onecare/auth';
import { DomainError } from '@onecare/shared';
import {
  RequirePermissions,
  type AuthenticatedRequest,
} from '../../../shared/presentation/auth.decorators';
import { McpService } from '../application/mcp.service';

@Controller('v1/mcp')
export class McpController {
  constructor(private readonly mcp: McpService) {}

  @Get('connectors')
  @RequirePermissions(PERMISSIONS.MCP_CONNECTORS_READ)
  listConnectors(@Req() req: AuthenticatedRequest) {
    return {
      data: this.mcp.listConnectors(),
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }

  @Get('connectors/:id')
  @RequirePermissions(PERMISSIONS.MCP_CONNECTORS_READ)
  getConnector(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return {
      data: this.mcp.getConnector(id),
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }

  @Get('tools')
  @RequirePermissions(PERMISSIONS.MCP_TOOLS_READ)
  listTools(@Req() req: AuthenticatedRequest, @Query('connectorId') connectorId?: string) {
    return {
      data: this.mcp.listTools(connectorId),
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }

  @Get('health')
  @RequirePermissions(PERMISSIONS.MCP_CONNECTORS_READ)
  async health(@Req() req: AuthenticatedRequest) {
    return {
      data: await this.mcp.health(),
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }

  @Post('execute')
  @RequirePermissions(PERMISSIONS.MCP_EXECUTE)
  async execute(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      connectorId?: string;
      toolName?: string;
      arguments?: Record<string, unknown>;
      confirmationId?: string;
      idempotencyKey?: string;
    },
  ) {
    if (!body.connectorId?.trim() || !body.toolName?.trim()) {
      throw new DomainError('VALIDATION', 'connectorId and toolName are required');
    }
    const data = await this.mcp.execute({
      context: req.requestContext!,
      connectorId: body.connectorId.trim(),
      toolName: body.toolName.trim(),
      arguments: body.arguments ?? {},
      ...(body.confirmationId ? { confirmationId: body.confirmationId } : {}),
      ...(body.idempotencyKey ? { idempotencyKey: body.idempotencyKey } : {}),
    });
    return {
      data,
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }

  @Post('confirmations/:id/approve')
  @RequirePermissions(PERMISSIONS.MCP_EXECUTE)
  async approveConfirmation(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const data = await this.mcp.approveConfirmation(req.requestContext!, id);
    return {
      data,
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }

  @Post('confirmations/:id/cancel')
  @RequirePermissions(PERMISSIONS.MCP_EXECUTE)
  async cancelConfirmation(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const data = await this.mcp.cancelConfirmation(req.requestContext!, id);
    return {
      data,
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }
}
