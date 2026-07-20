import { randomUUID } from 'node:crypto';
import type { ExecutionPlan, PlanStep, PlannerInput, PlannerPort } from './types';

interface RouteRule {
  readonly agentId: string;
  readonly intent: string;
  readonly patterns: readonly RegExp[];
  readonly toolNames?: readonly string[];
  readonly risk?: PlanStep['risk'];
  readonly requiresConfirmation?: boolean;
  readonly priority?: number;
}

/**
 * Routing table only — domain validation/clarification lives in capabilities (e.g. ess-leave).
 * More specific leave rules are listed first (higher priority wins when multiple match).
 */
const ROUTES: readonly RouteRule[] = [
  {
    agentId: 'employee',
    intent: 'employee.leave.cancel',
    patterns: [/\bcancel\b.*\bleave\b/i, /\bleave\b.*\bcancel\b/i],
    toolNames: ['cancelLeave'],
    risk: 'medium',
    requiresConfirmation: true,
    priority: 100,
  },
  {
    agentId: 'employee',
    intent: 'employee.leave.apply',
    patterns: [
      /\bapply\b.*\bleave\b/i,
      /\bneed\s+leave\b/i,
      /\btake\s+leave\b/i,
      /\bbook\s+leave\b/i,
      /\brequest\s+leave\b/i,
    ],
    toolNames: ['applyLeave'],
    risk: 'medium',
    requiresConfirmation: true,
    priority: 95,
  },
  {
    agentId: 'employee',
    intent: 'employee.leave.types',
    patterns: [/\bleave types?\b/i, /\bwhich leave\b/i, /\bavailable leave types?\b/i],
    toolNames: ['leaveTypes'],
    priority: 90,
  },
  {
    agentId: 'employee',
    intent: 'employee.leave.holidays',
    patterns: [/\bholidays?\b/i, /\bpublic holiday\b/i],
    toolNames: ['holidayCalendar'],
    priority: 88,
  },
  {
    agentId: 'employee',
    intent: 'employee.leave.history',
    patterns: [
      /\bleave history\b/i,
      /\brecent leave\b/i,
      /\bleave requests?\b/i,
      /\bleave\b.*\bapproved\b/i,
      /\bleave\b.*\bstatus\b/i,
    ],
    toolNames: ['leaveHistory'],
    priority: 85,
  },
  {
    agentId: 'employee',
    intent: 'employee.leave.balance',
    patterns: [
      /\bleave balance\b/i,
      /\bhow many leaves?\b/i,
      /\bhow much leave\b/i,
      /\benough\b.*\bleave\b/i,
      /\bleaves? (do i|i) have\b/i,
    ],
    toolNames: ['leaveBalance'],
    priority: 80,
  },
  {
    agentId: 'employee',
    intent: 'employee.attendance.clock_out',
    patterns: [/\bclock\s*(me\s*)?out\b/i, /\bcheck\s*out\b/i],
    toolNames: ['clockOut'],
    risk: 'medium',
    requiresConfirmation: true,
    priority: 98,
  },
  {
    agentId: 'employee',
    intent: 'employee.attendance.clock_in',
    patterns: [/\bclock\s*(me\s*)?in\b/i, /\bcheck\s*in\b/i, /\bmark\s+(my\s+)?attendance\b/i],
    toolNames: ['clockIn'],
    priority: 97,
  },
  {
    agentId: 'employee',
    intent: 'employee.attendance.regularize',
    patterns: [/\bregularize\b/i, /\battendance\s+regularization\b/i],
    toolNames: ['attendanceRegularization'],
    risk: 'medium',
    requiresConfirmation: true,
    priority: 96,
  },
  {
    agentId: 'employee',
    intent: 'employee.attendance.today',
    patterns: [/\bam i checked in\b/i, /\btoday'?s attendance\b/i, /\battendance today\b/i],
    toolNames: ['attendanceToday'],
    priority: 88,
  },
  {
    agentId: 'employee',
    intent: 'employee.attendance.summary',
    patterns: [/\battendance summary\b/i, /\bwfh\b/i, /\bworking hours\b/i],
    toolNames: ['attendanceSummary', 'workingHours'],
    priority: 87,
  },
  {
    agentId: 'employee',
    intent: 'employee.attendance.history',
    patterns: [/\battendance history\b/i, /\bshow (this month'?s |my )?attendance\b/i],
    toolNames: ['attendanceHistory'],
    priority: 86,
  },
  {
    agentId: 'employee',
    intent: 'employee.self_service',
    patterns: [/leave/i, /balance/i, /attendance/i, /payslip/i, /my profile/i],
    toolNames: ['leaveBalance', 'attendanceToday'],
    priority: 40,
  },
  {
    agentId: 'manager',
    intent: 'manager.approvals',
    patterns: [/approve/i, /reject/i, /team leave/i, /my team/i],
    toolNames: ['approveRequest'],
    risk: 'medium',
    requiresConfirmation: true,
    priority: 70,
  },
  {
    agentId: 'hr',
    intent: 'hr.case',
    patterns: [/hr policy/i, /hr case/i, /onboarding/i],
    priority: 50,
  },
  {
    agentId: 'knowledge',
    intent: 'knowledge.search',
    patterns: [/policy/i, /handbook/i, /how do i/i, /search knowledge/i, /in the wiki/i],
    toolNames: ['searchKnowledge'],
    priority: 45,
  },
  {
    agentId: 'finance',
    intent: 'finance.query',
    patterns: [/expense/i, /invoice/i, /reimburse/i],
    priority: 40,
  },
  {
    agentId: 'it',
    intent: 'it.support',
    patterns: [/password/i, /laptop/i, /ticket/i, /access request/i],
    risk: 'medium',
    requiresConfirmation: true,
    priority: 40,
  },
  {
    agentId: 'recruitment',
    intent: 'recruitment.query',
    patterns: [/candidate/i, /hiring/i, /job req/i],
    priority: 40,
  },
  {
    agentId: 'learning',
    intent: 'learning.query',
    patterns: [/course/i, /training/i, /learning/i],
    priority: 40,
  },
  {
    agentId: 'notification',
    intent: 'notification.send',
    patterns: [/notify/i, /send email/i, /teams message/i],
    toolNames: ['sendNotification'],
    risk: 'medium',
    requiresConfirmation: true,
    priority: 40,
  },
  {
    agentId: 'workflow',
    intent: 'workflow.run',
    patterns: [/workflow/i, /long running/i],
    risk: 'high',
    requiresConfirmation: true,
    priority: 40,
  },
];

/** Intent router only — no domain business rules. */
export class HeuristicPlanner implements PlannerPort {
  async plan(input: PlannerInput): Promise<ExecutionPlan> {
    const matched = ROUTES.filter((route) =>
      route.patterns.some((pattern) => pattern.test(input.message)),
    ).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    // Prefer single best employee domain route when multiple ESS signals fire
    const primary = matched[0];
    const stepsSource =
      primary &&
      primary.agentId === 'employee' &&
      (primary.intent.startsWith('employee.leave.') ||
        primary.intent.startsWith('employee.attendance.'))
        ? [primary]
        : matched.length > 0
          ? matched
          : null;

    const steps: PlanStep[] =
      stepsSource !== null
        ? stepsSource.map((route, index) => ({
            id: `step-${index + 1}`,
            agentId: route.agentId,
            intent: route.intent,
            rationale: `Matched routing signals for ${route.agentId}`,
            requiresConfirmation: route.requiresConfirmation ?? false,
            risk: route.risk ?? 'low',
            status: 'pending' as const,
            ...(route.toolNames ? { toolNames: route.toolNames } : {}),
            ...(stepsSource.length > 1 ? { parallelGroup: 'future' } : {}),
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
