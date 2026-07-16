import type { McpToolDefinition } from '@onecare/mcp';
import { Controller, Get } from '@nestjs/common';

const stubTools: readonly McpToolDefinition[] = [
  {
    name: 'leaveBalance',
    description: 'Get leave balance for the authenticated employee',
    sideEffect: 'read',
    risk: 'low',
    inputSchema: { type: 'object', properties: {} },
    outputSchema: {
      type: 'object',
      properties: { daysRemaining: { type: 'number' } },
    },
  },
];

@Controller()
export class HealthController {
  @Get('v1/health')
  health() {
    return {
      data: {
        status: 'ok',
        service: 'mcp-gateway',
        registeredStubTools: stubTools.length,
      },
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Get('v1/tools')
  listTools() {
    return {
      data: stubTools,
      meta: { timestamp: new Date().toISOString() },
    };
  }
}
