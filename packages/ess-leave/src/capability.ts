import {
  CommonEntities,
  buildConfirmationDraft,
  countWeekdaysInclusive,
  textResponse,
  type CapabilityExecuteInput,
  type CapabilityExecuteResult,
  type CapabilityHandleInput,
  type CapabilityHelp,
  type CapabilityResponse,
  type CapabilityTelemetryDescriptor,
  type CapabilityTurnInput,
  type ClarificationResult,
  type ConfirmationDraft,
  type DashboardWidgetDef,
  type EmployeeCapability,
  type EntityDeclaration,
  type ExecutionPlan,
  type SlotBag,
  type SuggestedPromptDef,
  type ValidationIssue,
  type ValidationResult,
} from '@onecare/ess-capability';
import { extractLeaveEntities, mergeSlots } from './entities';
import { detectLeaveIntent, isLeaveRelatedMessage } from './intents';
import {
  buildApplyConfirmationSummary,
  buildCancelConfirmationSummary,
  clarificationQuestion,
  missingSlotsForIntent,
  validateLeaveSlots,
} from './validation';
import type {
  LeaveBalanceItem,
  LeaveCapabilityInput,
  LeaveCapabilityOutcome,
  LeaveIntent,
  LeaveSlots,
  LeaveToolName,
} from './types';

const LEAVE_ENTITIES: readonly EntityDeclaration[] = [
  { ...CommonEntities.dateRange, requiredForIntents: ['employee.leave.apply'] },
  { ...CommonEntities.leaveType, requiredForIntents: ['employee.leave.apply'] },
  { ...CommonEntities.reason, requiredForIntents: ['employee.leave.apply'] },
  { ...CommonEntities.halfDay },
  { ...CommonEntities.requestId, requiredForIntents: ['employee.leave.cancel'] },
];

function asLeaveSlots(slots: SlotBag): LeaveSlots {
  return {
    ...(typeof slots.startDate === 'string' ? { startDate: slots.startDate } : {}),
    ...(typeof slots.endDate === 'string' ? { endDate: slots.endDate } : {}),
    ...(typeof slots.leaveType === 'string' ? { leaveType: slots.leaveType } : {}),
    ...(typeof slots.reason === 'string' ? { reason: slots.reason } : {}),
    ...(typeof slots.requestId === 'string' ? { requestId: slots.requestId } : {}),
    ...(typeof slots.halfDay === 'boolean' ? { halfDay: slots.halfDay } : {}),
    ...(typeof slots.durationDays === 'number' ? { durationDays: slots.durationDays } : {}),
    ...(typeof slots.statusFilter === 'string' ? { statusFilter: slots.statusFilter } : {}),
  };
}

function toSlotBag(slots: LeaveSlots): SlotBag {
  return { ...slots };
}

/**
 * Leave capability — reference Employee Capability Framework implementation.
 * `process()` preserves the Slice 1 contract used by the Master Orchestrator.
 */
export class LeaveCapability implements EmployeeCapability {
  readonly id = 'ess.leave';
  readonly name = 'Leave';
  readonly version = '1.0.0';
  readonly description = 'Employee leave balance, history, apply, cancel, types, and holidays.';
  readonly supportedIntents = [
    'employee.leave.balance',
    'employee.leave.history',
    'employee.leave.apply',
    'employee.leave.cancel',
    'employee.leave.types',
    'employee.leave.holidays',
    'employee.leave.status',
    'employee.leave.enough',
  ] as const;
  readonly supportedEntities = LEAVE_ENTITIES;
  readonly supportedTools = [
    'leaveBalance',
    'leaveHistory',
    'applyLeave',
    'cancelLeave',
    'leaveTypes',
    'holidayCalendar',
  ] as const;
  readonly requiredPermissions = ['leave.read', 'leave.apply', 'leave.cancel', 'holiday.read'];
  readonly priority = 100;
  readonly enabled = true;

  canHandle(input: CapabilityHandleInput): boolean {
    if (input.intent?.startsWith('employee.leave')) return true;
    if (
      input.priorSlots &&
      Object.keys(input.priorSlots).length > 0 &&
      isLeaveRelatedMessage(input.message)
    ) {
      return true;
    }
    if (
      input.priorSlots &&
      (input.priorSlots['leaveType'] ||
        input.priorSlots['startDate'] ||
        input.priorSlots['requestId'])
    ) {
      return true;
    }
    return isLeaveRelatedMessage(input.message) || Boolean(detectLeaveIntent(input.message));
  }

  detectIntent(message: string, priorSlots?: SlotBag): string | undefined {
    const detected = detectLeaveIntent(message);
    if (detected) return detected.intent;
    const prior = asLeaveSlots(priorSlots ?? {});
    if (prior.requestId) return 'employee.leave.cancel';
    if (prior.leaveType || prior.startDate) return 'employee.leave.apply';
    return undefined;
  }

  extractEntities(input: CapabilityTurnInput): SlotBag {
    const prior = asLeaveSlots(input.priorSlots ?? {});
    const extracted = extractLeaveEntities(input.message, prior, input.now);
    return toSlotBag(mergeSlots(prior, extracted));
  }

  missingSlots(intent: string, slots: SlotBag): readonly string[] {
    return missingSlotsForIntent(intent as LeaveIntent, asLeaveSlots(slots));
  }

  validate(
    input: CapabilityTurnInput & { readonly slots: SlotBag; readonly intent: string },
  ): ValidationResult {
    const extras = input.extras ?? {};
    const issues = validateLeaveSlots({
      intent: input.intent as LeaveIntent,
      slots: asLeaveSlots(input.slots),
      ...(input.now ? { now: input.now } : {}),
      ...(extras['balances']
        ? { balances: extras['balances'] as readonly LeaveBalanceItem[] }
        : {}),
      ...(extras['holidays']
        ? { holidays: extras['holidays'] as { date: string; name: string }[] }
        : {}),
      ...(extras['leaveTypes'] ? { leaveTypes: extras['leaveTypes'] as string[] } : {}),
    });
    const mapped: ValidationIssue[] = issues.map((i) => ({
      code: i.code,
      message: i.message,
      ...(i.field ? { field: i.field } : {}),
      severity: i.code === 'WEEKEND_ONLY' ? 'warning' : 'error',
    }));
    const errors = mapped.filter((i) => i.severity === 'error');
    return { ok: errors.length === 0, issues: mapped };
  }

  clarify(input: {
    readonly intent: string;
    readonly missing: readonly string[];
    readonly slots: SlotBag;
  }): ClarificationResult {
    const first = input.missing[0] ?? 'details';
    const ask = clarificationQuestion(first, asLeaveSlots(input.slots));
    return {
      question: ask.question,
      missing: input.missing,
      slots: input.slots,
      ...(ask.suggestedReplies ? { suggestedReplies: ask.suggestedReplies } : {}),
    };
  }

  buildExecutionPlan(
    input: CapabilityTurnInput & { readonly slots: SlotBag; readonly intent: string },
  ): ExecutionPlan | null {
    const leaveSlots = asLeaveSlots(input.slots);
    const slots = toSlotBag(leaveSlots);
    const detected = detectLeaveIntent(input.message);
    const toolName =
      (detected?.toolName as LeaveToolName | undefined) ??
      this.toolForIntent(input.intent as LeaveIntent);
    if (!toolName) return null;

    if (input.intent === 'employee.leave.enough') {
      return {
        intent: input.intent,
        toolName: 'leaveBalance',
        arguments: {},
        requiresConfirmation: false,
        slots,
        risk: 'low',
      };
    }

    if (toolName === 'applyLeave') {
      const args: Record<string, unknown> = {
        startDate: leaveSlots.startDate,
        endDate: leaveSlots.endDate,
        leaveType: leaveSlots.leaveType,
        ...(leaveSlots.reason ? { reason: leaveSlots.reason } : {}),
        ...(leaveSlots.halfDay !== undefined ? { halfDay: leaveSlots.halfDay } : {}),
      };
      return {
        intent: input.intent,
        toolName: 'applyLeave',
        arguments: args,
        requiresConfirmation: true,
        slots,
        risk: 'medium',
      };
    }

    if (toolName === 'cancelLeave') {
      return {
        intent: input.intent,
        toolName: 'cancelLeave',
        arguments: {
          requestId: leaveSlots.requestId,
          ...(leaveSlots.reason ? { reason: leaveSlots.reason } : {}),
        },
        requiresConfirmation: true,
        slots,
        risk: 'medium',
      };
    }

    if (toolName === 'leaveHistory') {
      const args: Record<string, unknown> = {};
      if (leaveSlots.startDate) args.fromDate = leaveSlots.startDate;
      if (leaveSlots.endDate) args.toDate = leaveSlots.endDate;
      if (input.intent === 'employee.leave.status') args.status = 'pending_approval';
      return {
        intent: input.intent,
        toolName: 'leaveHistory',
        arguments: args,
        requiresConfirmation: false,
        slots,
        risk: 'low',
      };
    }

    if (toolName === 'holidayCalendar') {
      const now = input.now ?? new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      return {
        intent: input.intent,
        toolName: 'holidayCalendar',
        arguments: { month },
        requiresConfirmation: false,
        slots,
        risk: 'low',
      };
    }

    return {
      intent: input.intent,
      toolName,
      arguments: {},
      requiresConfirmation: false,
      slots,
      risk: 'low',
    };
  }

  buildConfirmation(input: {
    readonly plan: ExecutionPlan;
    readonly slots: SlotBag;
    readonly extras?: Readonly<Record<string, unknown>>;
  }): ConfirmationDraft | null {
    if (!input.plan.requiresConfirmation) return null;
    const slots = asLeaveSlots(input.slots);
    let summary: string;
    if (input.plan.toolName === 'applyLeave') {
      const balances = input.extras?.['balances'] as readonly LeaveBalanceItem[] | undefined;
      const needed = slots.halfDay
        ? 0.5
        : countWeekdaysInclusive(slots.startDate!, slots.endDate!) || 1;
      const balance = balances?.find(
        (b) => b.leaveType.toLowerCase() === (slots.leaveType ?? '').toLowerCase(),
      );
      const balanceAfter =
        balance !== undefined ? Math.max(0, balance.available - needed) : undefined;
      summary = buildApplyConfirmationSummary(slots, balanceAfter);
    } else if (input.plan.toolName === 'cancelLeave') {
      summary = buildCancelConfirmationSummary(slots);
    } else {
      summary = `Confirm ${input.plan.toolName}?`;
    }
    return buildConfirmationDraft({
      plan: input.plan,
      summary,
      risk: input.plan.risk ?? 'medium',
    });
  }

  async execute(input: CapabilityExecuteInput): Promise<CapabilityExecuteResult> {
    const tool = input.tools.getTool?.(input.plan.toolName);
    if (tool && !tool.implemented) {
      return { kind: 'failed', message: 'That leave action is not available yet.' };
    }
    const result = await input.tools.execute({
      toolName: input.plan.toolName,
      ...(tool?.connectorId ? { connectorId: tool.connectorId } : {}),
      arguments: input.plan.arguments,
      context: input.context,
      confirmationApproved: input.confirmationApproved,
    });
    if (result.decision === 'confirmation_required') {
      return {
        kind: 'confirmation_required',
        ...(result.confirmationId ? { confirmationId: result.confirmationId } : {}),
        summary: result.errorMessage ?? 'Confirmation required.',
      };
    }
    if (!result.ok) {
      return { kind: 'failed', message: result.errorMessage ?? 'Leave tool failed.' };
    }
    return { kind: 'completed', data: result.data };
  }

  formatResponse(input: {
    readonly intent?: string;
    readonly toolName?: string;
    readonly toolResult?: unknown;
    readonly message?: string;
    readonly suggestedReplies?: readonly string[];
  }): CapabilityResponse {
    if (input.message) {
      return textResponse(input.message, {
        ...(input.suggestedReplies ? { suggestedReplies: input.suggestedReplies } : {}),
      });
    }
    const text = formatLeaveToolResult(input.toolName, input.toolResult);
    return textResponse(text);
  }

  dashboardWidgets(): readonly DashboardWidgetDef[] {
    return [
      {
        id: 'leave.balance',
        title: 'Leave Balance',
        description: 'Available leave by type',
        route: '/app/employee/leave',
        order: 10,
        requiredPermissions: ['leave.read'],
      },
      {
        id: 'leave.upcoming',
        title: 'Upcoming Leave',
        route: '/app/employee/leave',
        order: 20,
        requiredPermissions: ['leave.read'],
      },
      {
        id: 'leave.recent',
        title: 'Recent Leave Requests',
        route: '/app/employee/leave',
        order: 30,
        requiredPermissions: ['leave.read'],
      },
      {
        id: 'leave.holidays',
        title: 'Holiday Calendar',
        route: '/app/employee/leave/holidays',
        order: 40,
        requiredPermissions: ['holiday.read'],
      },
      {
        id: 'leave.quick_actions',
        title: 'Leave Quick Actions',
        route: '/app/ai',
        order: 50,
        requiredPermissions: ['leave.apply'],
      },
    ];
  }

  suggestedPrompts(): readonly SuggestedPromptDef[] {
    return [
      {
        id: 'leave.balance',
        label: 'Leave balance',
        prompt: 'What is my leave balance?',
        kind: 'starter',
      },
      { id: 'leave.apply', label: 'Apply leave', prompt: 'Apply leave tomorrow', kind: 'starter' },
      {
        id: 'leave.history',
        label: 'Leave history',
        prompt: 'Show my leave history',
        kind: 'follow_up',
      },
      {
        id: 'leave.holidays',
        label: 'Holidays',
        prompt: 'What holidays are coming this month?',
        kind: 'dashboard',
      },
      {
        id: 'leave.types',
        label: 'Leave types',
        prompt: 'Which leave types are available?',
        kind: 'quick_action',
      },
    ];
  }

  helpExamples(): CapabilityHelp {
    return {
      description: this.description,
      examples: [
        'How many leaves do I have?',
        'Apply casual leave next Friday',
        'Cancel my leave for tomorrow',
        'What holidays are coming this month?',
      ],
      supportedActions: [...this.supportedTools],
      limitations: [
        'Does not approve others’ leave (Manager Agent).',
        'Does not call Keka directly — uses Tool Registry / MCP.',
      ],
      requiredPermissions: [...this.requiredPermissions],
    };
  }

  telemetry(): CapabilityTelemetryDescriptor {
    return { capabilityId: this.id, metricsPrefix: 'ess.leave' };
  }

  /**
   * Slice 1 orchestrator entrypoint — behavior unchanged.
   */
  process(input: LeaveCapabilityInput): LeaveCapabilityOutcome {
    const detected = detectLeaveIntent(input.message);
    if (!detected && !isLeaveRelatedMessage(input.message) && !input.priorSlots) {
      return {
        kind: 'unsupported',
        message: 'I can help with leave balance, history, apply, cancel, types, and holidays.',
      };
    }

    const prior = input.priorSlots ?? {};
    const inferredIntent =
      detected ??
      (prior.leaveType || prior.startDate || prior.requestId
        ? {
            intent: prior.requestId
              ? ('employee.leave.cancel' as const)
              : ('employee.leave.apply' as const),
            toolName: prior.requestId ? ('cancelLeave' as const) : ('applyLeave' as const),
            requiresConfirmation: true,
          }
        : null);

    if (!inferredIntent) {
      return {
        kind: 'unsupported',
        message: 'Could you clarify whether you want leave balance, history, apply, or cancel?',
      };
    }

    const slots = asLeaveSlots(
      this.extractEntities({
        message: input.message,
        intent: inferredIntent.intent,
        priorSlots: toSlotBag(prior),
        ...(input.now ? { now: input.now } : {}),
      }),
    );

    if (inferredIntent.intent === 'employee.leave.enough') {
      return {
        kind: 'ready',
        intent: inferredIntent.intent,
        toolName: 'leaveBalance',
        arguments: {},
        slots,
        requiresConfirmation: false,
      };
    }

    const missing = this.missingSlots(inferredIntent.intent, toSlotBag(slots));
    if (missing.length > 0) {
      const clarification = this.clarify({
        intent: inferredIntent.intent,
        missing,
        slots: toSlotBag(slots),
      });
      return {
        kind: 'clarify',
        intent: inferredIntent.intent,
        question: clarification.question,
        missing: clarification.missing,
        slots,
        ...(clarification.suggestedReplies
          ? { suggestedReplies: clarification.suggestedReplies }
          : {}),
      };
    }

    const validation = this.validate({
      message: input.message,
      intent: inferredIntent.intent,
      slots: toSlotBag(slots),
      ...(input.now ? { now: input.now } : {}),
      extras: {
        ...(input.balances ? { balances: input.balances } : {}),
        ...(input.holidays ? { holidays: input.holidays } : {}),
        ...(input.leaveTypes ? { leaveTypes: input.leaveTypes } : {}),
      },
    });
    const blocking = validation.issues.filter((i) => i.severity !== 'warning');
    if (blocking.length > 0) {
      return {
        kind: 'invalid',
        intent: inferredIntent.intent,
        message: blocking.map((i) => i.message).join(' '),
        issues: blocking.map((i) => ({
          code: i.code,
          message: i.message,
          ...(i.field ? { field: i.field } : {}),
        })),
        suggestedReplies: ['Check my leave balance', 'Show leave types'],
      };
    }

    const plan = this.buildExecutionPlan({
      message: input.message,
      intent: inferredIntent.intent,
      slots: toSlotBag(slots),
      ...(input.now ? { now: input.now } : {}),
      extras: {
        ...(input.balances ? { balances: input.balances } : {}),
      },
    });
    if (!plan) {
      return {
        kind: 'unsupported',
        message: 'Could not plan that leave action.',
      };
    }

    const confirmation = this.buildConfirmation({
      plan,
      slots: toSlotBag(slots),
      extras: {
        ...(input.balances ? { balances: input.balances } : {}),
      },
    });

    return {
      kind: 'ready',
      intent: inferredIntent.intent as LeaveIntent,
      toolName: plan.toolName as LeaveToolName,
      arguments: plan.arguments,
      slots,
      requiresConfirmation: plan.requiresConfirmation,
      ...(confirmation?.summary ? { confirmationSummary: confirmation.summary } : {}),
    };
  }

  private toolForIntent(intent: LeaveIntent): LeaveToolName | undefined {
    switch (intent) {
      case 'employee.leave.balance':
      case 'employee.leave.enough':
        return 'leaveBalance';
      case 'employee.leave.history':
      case 'employee.leave.status':
        return 'leaveHistory';
      case 'employee.leave.apply':
        return 'applyLeave';
      case 'employee.leave.cancel':
        return 'cancelLeave';
      case 'employee.leave.types':
        return 'leaveTypes';
      case 'employee.leave.holidays':
        return 'holidayCalendar';
      default:
        return undefined;
    }
  }
}

export function createLeaveCapability(): LeaveCapability {
  return new LeaveCapability();
}

function formatLeaveToolResult(toolName: string | undefined, toolResult: unknown): string {
  if (toolName === 'leaveBalance' && toolResult && typeof toolResult === 'object') {
    const data = toolResult as { balances?: Array<{ leaveType: string; available: number }> };
    if (data.balances?.length) {
      const lines = data.balances.map((b) => `• ${b.leaveType}: ${b.available} day(s)`);
      return `Here is your leave balance:\n${lines.join('\n')}`;
    }
  }
  if (toolName === 'leaveHistory' && toolResult && typeof toolResult === 'object') {
    const data = toolResult as {
      items?: Array<{ requestId: string; leaveType: string; status: string; startDate: string }>;
    };
    if (data.items?.length) {
      const lines = data.items.map(
        (i) => `• ${i.requestId} — ${i.leaveType} (${i.startDate}) — ${i.status}`,
      );
      return `Your leave requests:\n${lines.join('\n')}`;
    }
    return 'You have no leave requests in this period.';
  }
  if (toolName === 'leaveTypes' && toolResult && typeof toolResult === 'object') {
    const data = toolResult as { types?: Array<{ name: string }> | string[] };
    const names = Array.isArray(data.types)
      ? data.types.map((t) => (typeof t === 'string' ? t : t.name))
      : [];
    if (names.length) return `Available leave types: ${names.join(', ')}.`;
  }
  if (toolName === 'holidayCalendar' && toolResult && typeof toolResult === 'object') {
    const data = toolResult as { holidays?: Array<{ date: string; name: string }> };
    if (data.holidays?.length) {
      return `Upcoming holidays:\n${data.holidays.map((h) => `• ${h.date} — ${h.name}`).join('\n')}`;
    }
    return 'No holidays found for this period.';
  }
  if (toolName === 'applyLeave' && toolResult && typeof toolResult === 'object') {
    const data = toolResult as { requestId?: string; status?: string };
    return `Leave applied successfully. Request ${data.requestId ?? ''} is ${data.status ?? 'submitted'}.`.trim();
  }
  if (toolName === 'cancelLeave' && toolResult && typeof toolResult === 'object') {
    const data = toolResult as { requestId?: string; status?: string };
    return `Leave request ${data.requestId ?? ''} is ${data.status ?? 'cancelled'}.`;
  }
  return 'Done.';
}

export function formatLeaveAssistantMessage(
  outcome: LeaveCapabilityOutcome,
  toolResult?: unknown,
): string {
  if (outcome.kind === 'clarify') return outcome.question;
  if (outcome.kind === 'invalid') return outcome.message;
  if (outcome.kind === 'unsupported') return outcome.message;
  return formatLeaveToolResult(outcome.toolName, toolResult);
}

export type { LeaveSlots };
