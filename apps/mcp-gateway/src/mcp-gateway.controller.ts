import { createMcpPlatform, type McpExecutionContext } from '@onecare/mcp';
import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';

@Controller()
export class McpGatewayController {
  private readonly platformPromise = createMcpPlatform();

  @Get('v1/health')
  async health() {
    const platform = await this.platformPromise;
    const summary = await platform.gateway.healthSummary();
    return {
      data: { service: 'mcp-gateway', ...summary },
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Get('v1/connectors')
  async listConnectors() {
    const platform = await this.platformPromise;
    return {
      data: platform.gateway.listConnectors(),
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Get('v1/connectors/:id')
  async getConnector(@Param('id') id: string) {
    const platform = await this.platformPromise;
    return {
      data: platform.gateway.getConnector(id),
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Get('v1/tools')
  async listTools(@Query('connectorId') connectorId?: string) {
    const platform = await this.platformPromise;
    return {
      data: platform.gateway.listTools(connectorId),
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Post('v1/execute')
  async execute(
    @Body()
    body: {
      connectorId?: string;
      toolName?: string;
      arguments?: Record<string, unknown>;
      context?: McpExecutionContext;
    },
  ) {
    const platform = await this.platformPromise;
    if (!body.connectorId || !body.toolName || !body.context) {
      return {
        data: {
          ok: false,
          errorCode: 'VALIDATION',
          errorMessage: 'connectorId, toolName, and context are required',
          latencyMs: 0,
        },
      };
    }
    const result = await platform.gateway.execute({
      connectorId: body.connectorId,
      toolName: body.toolName,
      arguments: body.arguments ?? {},
      context: body.context,
    });
    return { data: result, meta: { timestamp: new Date().toISOString() } };
  }
}
