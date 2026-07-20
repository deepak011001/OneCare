import { randomUUID } from 'node:crypto';
import type { ExecutionPlan, PlanStep, PlannerInput, PlannerPort } from './types';

interface RouteRule {
  readonly agentId: string;
  readonly intent: string;
  readonly patterns: readonly RegExp[];
  readonly toolNames?: readonly string[];
  readonly risk?: PlanStep['risk'];
  readonly requiresConfirmation?: boolean;
}

const ROUTES: readonly RouteRule[] = [
  {
    agentId: 'employee',
    intent: 'employee.self_service',
    patterns: [/leave/i, /balance/i, /attendance/i, /payslip/i, /my profile/i],
    toolNames: ['leaveBalance', 'attendance'],
  },
  {
    agentId: 'manager',
    intent: 'manager.approvals',
    patterns: [/approve/i, /reject/i, /team leave/i, /my team/i],
    toolNames: ['approveRequest'],
    risk: 'medium',
    requiresConfirmation: true,
  },
  {
    agentId: 'hr',
    intent: 'hr.case',
    patterns: [/hr policy/i, /hr case/i, /onboarding/i],
  },
  {
    agentId: 'knowledge',
    intent: 'knowledge.search',
    patterns: [/policy/i, /handbook/i, /how do i/i, /search knowledge/i, /in the wiki/i],
    toolNames: ['searchKnowledge'],
  },
  {
    agentId: 'finance',
    intent: 'finance.query',
    patterns: [/expense/i, /invoice/i, /reimburse/i],
  },
  {
    agentId: 'it',
    intent: 'it.support',
    patterns: [/password/i, /laptop/i, /ticket/i, /access request/i],
    risk: 'medium',
    requiresConfirmation: true,
  },
  {
    agentId: 'recruitment',
    intent: 'recruitment.query',
    patterns: [/candidate/i, /hiring/i, /job req/i],
  },
  {
    agentId: 'learning',
    intent: 'learning.query',
    patterns: [/course/i, /training/i, /learning/i],
  },
  {
    agentId: 'notification',
    intent: 'notification.send',
    patterns: [/notify/i, /send email/i, /teams message/i],
    toolNames: ['sendNotification'],
    risk: 'medium',
    requiresConfirmation: true,
  },
  {
    agentId: 'workflow',
    intent: 'workflow.run',
    patterns: [/workflow/i, /long running/i],
    risk: 'high',
    requiresConfirmation: true,
  },
];

/** Intent router only — no domain business rules. */
export class HeuristicPlanner implements PlannerPort {
  async plan(input: PlannerInput): Promise<ExecutionPlan> {
    const matched = ROUTES.filter((route) =>
      route.patterns.some((pattern) => pattern.test(input.message)),
    );

    const steps: PlanStep[] =
      matched.length > 0
        ? matched.map((route, index) => ({
            id: `step-${index + 1}`,
            agentId: route.agentId,
            intent: route.intent,
            rationale: `Matched routing signals for ${route.agentId}`,
            requiresConfirmation: route.requiresConfirmation ?? false,
            risk: route.risk ?? 'low',
            status: 'pending' as const,
            ...(route.toolNames ? { toolNames: route.toolNames } : {}),
            ...(matched.length > 1 ? { parallelGroup: 'future' } : {}),
          }))
        : [
            {
              id: 'step-1',
              agentId: 'knowledge',
              intent: 'general.assist',
              rationale: 'Default safe route when no strong domain signal is present',
              requiresConfirmation: false,
              risk: 'low' as const,
              status: 'pending' as const,
              toolNames: ['searchKnowledge'],
            },
          ];

    const mode =
      steps.length > 1
        ? 'multi_agent'
        : steps.some((s) => s.requiresConfirmation && (s.risk === 'high' || s.risk === 'critical'))
          ? 'human_approval'
          : 'single_agent';

    return {
      id: randomUUID(),
      mode,
      steps,
      summary:
        steps.length === 1
          ? `Route to ${steps[0]?.agentId ?? 'unknown'}`
          : `Coordinate ${steps.length} agents`,
      createdAt: new Date(),
      requiresHumanApproval: steps.some(
        (s) => s.requiresConfirmation && (s.risk === 'high' || s.risk === 'critical'),
      ),
    };
  }
}
