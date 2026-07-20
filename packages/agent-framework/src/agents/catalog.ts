import type { EnterpriseAgent } from '../types';
import { healthyStatus } from '../registry';
import { mergeLifecycleHooks } from '../lifecycle';

/**
 * Employee Agent on the Enterprise Agent Framework.
 * Behavior stays in AI Runtime + ESS capabilities — this is the framework registration.
 */
export function createEmployeeEnterpriseAgent(): EnterpriseAgent {
  return {
    id: 'employee',
    name: 'EmployeeAgent',
    description: 'Employee self-service — leave, attendance, and knowledge capabilities (ESS).',
    version: '1.0.0',
    owner: 'ess-platform',
    priority: 100,
    supportedCapabilities: [
      { id: 'ess.leave.read', description: 'Read leave balance, history, types, holidays' },
      { id: 'ess.leave.write', description: 'Apply and cancel leave via MCP with confirmation' },
      { id: 'ess.attendance.read', description: 'Read attendance today, history, summary' },
      { id: 'ess.attendance.write', description: 'Clock in/out and regularize via MCP' },
      {
        id: 'ess.knowledge',
        description: 'Enterprise knowledge Q&A with retrieval and source attribution',
      },
      { id: 'ess.clarify', description: 'Multi-turn clarification for ESS slots' },
    ],
    requiredPermissions: ['ai.chat'],
    supportedRoles: ['Employee', 'Manager', 'HR', 'SystemAdmin', 'SuperAdmin'],
    featureFlags: ['agents.employee.enabled'],
    supportedIntents: [
      'employee.self_service',
      'employee.leave.balance',
      'employee.leave.history',
      'employee.leave.apply',
      'employee.leave.cancel',
      'employee.leave.types',
      'employee.leave.holidays',
      'employee.attendance.today',
      'employee.attendance.history',
      'employee.attendance.summary',
      'employee.attendance.clock_in',
      'employee.attendance.clock_out',
      'employee.attendance.regularize',
      'employee.knowledge.ask',
      'employee.knowledge.search',
      'employee.knowledge.related',
      'employee.knowledge.popular',
      'employee.knowledge.help',
      'employee.knowledge.categories',
    ],
    allowedTools: [
      'leaveBalance',
      'leaveHistory',
      'applyLeave',
      'cancelLeave',
      'leaveTypes',
      'holidayCalendar',
      'attendanceToday',
      'attendanceHistory',
      'attendanceSummary',
      'clockIn',
      'clockOut',
      'attendanceRegularization',
      'shiftSchedule',
      'workingHours',
      'searchKnowledge',
    ],
    systemPromptRef: 'agent.placeholder',
    enabled: true,
    lifecycle: mergeLifecycleHooks({
      beforePlanning: (ctx, message) => {
        ctx.telemetry?.record({
          type: 'agent.selected',
          agentId: 'employee',
          tenantId: ctx.tenantId,
          detail: { messageLength: message.length },
          at: new Date().toISOString(),
        });
      },
    }),
    health: () => healthyStatus('employee', 'healthy', 'ESS capabilities registered'),
  };
}

function placeholder(input: {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly intents: readonly string[];
  readonly capabilities: readonly { id: string; description: string }[];
  readonly tools?: readonly string[];
  readonly priority?: number;
}): EnterpriseAgent {
  return {
    id: input.id,
    name: input.name,
    description: input.description,
    version: '0.1.0',
    owner: 'platform',
    priority: input.priority ?? 50,
    supportedCapabilities: input.capabilities,
    requiredPermissions: ['ai.chat'],
    supportedRoles: ['Employee', 'Manager', 'HR', 'SystemAdmin', 'SuperAdmin'],
    supportedIntents: input.intents,
    allowedTools: input.tools ?? [],
    systemPromptRef: 'agent.placeholder',
    enabled: true,
    lifecycle: mergeLifecycleHooks(),
    health: () => healthyStatus(input.id, 'healthy', 'placeholder'),
  };
}

export function createCatalogEnterpriseAgents(): readonly EnterpriseAgent[] {
  return [
    createEmployeeEnterpriseAgent(),
    placeholder({
      id: 'manager',
      name: 'ManagerAgent',
      description: 'Manager services (MSS) placeholder.',
      intents: ['manager.approvals'],
      capabilities: [{ id: 'mss.approvals', description: 'Route approval intents' }],
      tools: ['approveRequest'],
      priority: 90,
    }),
    placeholder({
      id: 'hr',
      name: 'HRAgent',
      description: 'HR cases and policy routing placeholder.',
      intents: ['hr.case'],
      capabilities: [{ id: 'hr.case', description: 'Route HR case intents' }],
      tools: ['searchKnowledge'],
      priority: 80,
    }),
    placeholder({
      id: 'knowledge',
      name: 'KnowledgeAgent',
      description:
        'Enterprise knowledge routing. ESS knowledge Q&A is handled via Employee Agent + Knowledge Platform.',
      intents: ['knowledge.search', 'general.assist'],
      capabilities: [
        { id: 'knowledge.route', description: 'Route knowledge questions' },
        { id: 'ess.knowledge', description: 'Employee knowledge capability bridge' },
      ],
      tools: ['searchKnowledge'],
      priority: 70,
    }),
    placeholder({
      id: 'finance',
      name: 'FinanceAgent',
      description: 'Finance intents placeholder.',
      intents: ['finance.query'],
      capabilities: [{ id: 'finance.route', description: 'Route finance intents' }],
    }),
    placeholder({
      id: 'it',
      name: 'ITAgent',
      description: 'IT support intents placeholder.',
      intents: ['it.support'],
      capabilities: [{ id: 'it.route', description: 'Route IT intents' }],
    }),
    placeholder({
      id: 'recruitment',
      name: 'RecruitmentAgent',
      description: 'Recruitment intents placeholder.',
      intents: ['recruitment.query'],
      capabilities: [{ id: 'recruitment.route', description: 'Route recruitment intents' }],
    }),
    placeholder({
      id: 'learning',
      name: 'LearningAgent',
      description: 'Learning intents placeholder.',
      intents: ['learning.query'],
      capabilities: [{ id: 'learning.route', description: 'Route learning intents' }],
    }),
    placeholder({
      id: 'notification',
      name: 'NotificationAgent',
      description: 'Notification fan-out placeholder.',
      intents: ['notification.send'],
      capabilities: [{ id: 'notify.route', description: 'Route notification intents' }],
      tools: ['sendNotification'],
    }),
    placeholder({
      id: 'workflow',
      name: 'WorkflowAgent',
      description: 'Long-running workflow placeholder.',
      intents: ['workflow.run'],
      capabilities: [{ id: 'workflow.route', description: 'Route workflow intents' }],
    }),
  ];
}
