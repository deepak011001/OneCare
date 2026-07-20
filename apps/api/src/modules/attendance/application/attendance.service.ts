import { Inject, Injectable } from '@nestjs/common';
import type { EventBusPort } from '@onecare/events';
import { DOMAIN_EVENTS } from '@onecare/events';
import type { McpPlatform } from '@onecare/mcp';
import type { RequestContext } from '@onecare/shared';
import { AUDIT_ACTIONS, DomainError } from '@onecare/shared';
import { APP_TOKENS } from '../../../shared/tokens';
import type { AuditPort } from '../../audit/infrastructure/prisma-audit.service';
import { MCP_TOKENS } from '../../mcp/mcp.tokens';

@Injectable()
export class AttendanceService {
  constructor(
    @Inject(MCP_TOKENS.PLATFORM) private readonly platform: McpPlatform,
    @Inject(APP_TOKENS.EVENT_BUS) private readonly events: EventBusPort,
    @Inject(APP_TOKENS.AUDIT_PORT) private readonly audit: AuditPort,
  ) {}

  private async callTool(
    context: RequestContext,
    toolName: string,
    args: Readonly<Record<string, unknown>> = {},
  ) {
    const tool = this.platform.gateway.listTools('keka').find((t) => t.name === toolName);
    if (!tool) {
      throw new DomainError('NOT_FOUND', `Attendance tool ${toolName} is unavailable`);
    }
    const missing = tool.permissions.filter((p) => !context.permissions.includes(p));
    if (missing.length > 0) {
      await this.audit.write({
        tenantId: String(context.tenantId),
        userId: String(context.userId),
        sessionId: String(context.sessionId),
        action: AUDIT_ACTIONS.ATTENDANCE_VIEW_DENIED,
        resource: `attendance.tool.${toolName}`,
        resourceId: 'keka',
        result: 'denied',
        correlationId: String(context.correlationId),
        requestId: String(context.requestId),
        metadata: { missing },
      });
      throw new DomainError('FORBIDDEN', `Missing permissions: ${missing.join(', ')}`);
    }

    const result = await this.platform.gateway.execute({
      connectorId: 'keka',
      toolName,
      arguments: args,
      context: {
        tenantId: context.tenantId,
        userId: context.userId,
        correlationId: context.correlationId,
        roles: context.roles,
        permissions: context.permissions,
        attributes: context.attributes,
      },
    });

    await this.events.publish({
      name: DOMAIN_EVENTS.ATTENDANCE_TOOL_READ,
      occurredAt: new Date(),
      tenantId: String(context.tenantId),
      correlationId: String(context.correlationId),
      payload: { toolName, ok: result.ok },
    });

    await this.audit.write({
      tenantId: String(context.tenantId),
      userId: String(context.userId),
      sessionId: String(context.sessionId),
      action: AUDIT_ACTIONS.ATTENDANCE_VIEW,
      resource: `attendance.tool.${toolName}`,
      resourceId: 'keka',
      result: result.ok ? 'success' : 'failure',
      correlationId: String(context.correlationId),
      requestId: String(context.requestId),
      metadata: { toolName },
    });

    if (!result.ok) {
      throw new DomainError('BAD_GATEWAY', result.errorMessage ?? 'Attendance tool failed');
    }
    return result.data;
  }

  getToday(context: RequestContext) {
    return this.callTool(context, 'attendanceToday');
  }

  getHistory(context: RequestContext, status?: string) {
    return this.callTool(context, 'attendanceHistory', status ? { status } : {});
  }

  getSummary(context: RequestContext, month?: string) {
    return this.callTool(context, 'attendanceSummary', month ? { month } : {});
  }

  getHours(context: RequestContext, month?: string) {
    return this.callTool(context, 'workingHours', month ? { month } : {});
  }

  getShift(context: RequestContext) {
    return this.callTool(context, 'shiftSchedule');
  }

  async getDashboard(context: RequestContext) {
    const [today, history, summary, hours, shift] = await Promise.all([
      this.getToday(context),
      this.getHistory(context),
      this.getSummary(context),
      this.getHours(context),
      this.getShift(context),
    ]);
    return {
      today,
      recent: (history as { items?: unknown[] })?.items?.slice(0, 5) ?? [],
      summary,
      hours,
      shift,
      quickActions: [
        { id: 'clock-in', label: 'Clock in', href: '/app/ai?prompt=Clock%20me%20in' },
        { id: 'clock-out', label: 'Clock out', href: '/app/ai?prompt=Clock%20me%20out' },
        {
          id: 'summary',
          label: 'Attendance summary',
          href: '/app/ai?prompt=Show%20my%20attendance%20summary',
        },
      ],
    };
  }
}
