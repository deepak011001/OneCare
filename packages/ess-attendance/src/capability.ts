import {
  CommonEntities,
  buildConfirmationDraft,
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
import { extractAttendanceEntities, mergeAttendanceSlots } from './entities';
import { detectAttendanceIntent, isAttendanceRelatedMessage } from './intents';
import {
  buildClockOutConfirmationSummary,
  buildRegularizeConfirmationSummary,
  clarificationQuestion,
  missingSlotsForIntent,
  validateAttendanceSlots,
} from './validation';
import type {
  AttendanceCapabilityInput,
  AttendanceCapabilityOutcome,
  AttendanceIntent,
  AttendanceSlots,
  AttendanceTodaySnapshot,
  AttendanceToolName,
} from './types';

const ATTENDANCE_ENTITIES: readonly EntityDeclaration[] = [
  { ...CommonEntities.dateRange, requiredForIntents: ['employee.attendance.regularize'] },
  {
    id: 'attendance.date',
    kind: 'date',
    slotKey: 'date',
    label: 'Date',
    requiredForIntents: ['employee.attendance.regularize'],
    clarifyQuestion: 'Which date should I regularize?',
    suggestedReplies: ['Yesterday', 'Today'],
  },
  { ...CommonEntities.reason, requiredForIntents: ['employee.attendance.regularize'] },
  { ...CommonEntities.halfDay },
  {
    id: 'attendance.shift',
    kind: 'text',
    slotKey: 'shift',
    label: 'Shift',
  },
  {
    id: 'attendance.location',
    kind: 'location',
    slotKey: 'location',
    label: 'Location',
    clarifyQuestion: 'Which location should I use?',
    suggestedReplies: ['Office', 'Home'],
  },
];

function asAttendanceSlots(slots: SlotBag): AttendanceSlots {
  return {
    ...(typeof slots.date === 'string' ? { date: slots.date } : {}),
    ...(typeof slots.startDate === 'string' ? { startDate: slots.startDate } : {}),
    ...(typeof slots.endDate === 'string' ? { endDate: slots.endDate } : {}),
    ...(typeof slots.reason === 'string' ? { reason: slots.reason } : {}),
    ...(typeof slots.shift === 'string' ? { shift: slots.shift } : {}),
    ...(typeof slots.location === 'string' ? { location: slots.location } : {}),
    ...(typeof slots.halfDay === 'boolean' ? { halfDay: slots.halfDay } : {}),
    ...(typeof slots.statusFilter === 'string' ? { statusFilter: slots.statusFilter } : {}),
  };
}

function toSlotBag(slots: AttendanceSlots): SlotBag {
  return { ...slots };
}

export class AttendanceCapability implements EmployeeCapability {
  readonly id = 'ess.attendance';
  readonly name = 'Attendance';
  readonly version = '1.0.0';
  readonly description =
    'Employee attendance today, history, summary, clock in/out, regularization, and shifts.';
  readonly supportedIntents = [
    'employee.attendance.today',
    'employee.attendance.history',
    'employee.attendance.summary',
    'employee.attendance.clock_in',
    'employee.attendance.clock_out',
    'employee.attendance.regularize',
    'employee.attendance.shift',
    'employee.attendance.hours',
    'employee.attendance.late',
    'employee.attendance.absent',
    'employee.attendance.wfh',
  ] as const;
  readonly supportedEntities = ATTENDANCE_ENTITIES;
  readonly supportedTools = [
    'attendanceToday',
    'attendanceHistory',
    'attendanceSummary',
    'clockIn',
    'clockOut',
    'attendanceRegularization',
    'shiftSchedule',
    'workingHours',
  ] as const;
  readonly requiredPermissions = [
    'attendance.read',
    'attendance.clockin',
    'attendance.clockout',
    'attendance.regularize',
  ];
  readonly priority = 90;
  readonly enabled = true;

  canHandle(input: CapabilityHandleInput): boolean {
    if (input.intent?.startsWith('employee.attendance')) return true;
    if (
      input.priorSlots &&
      (input.priorSlots['date'] || input.priorSlots['reason'] || input.priorSlots['location'])
    ) {
      return isAttendanceRelatedMessage(input.message) || Boolean(input.priorSlots['date']);
    }
    return (
      isAttendanceRelatedMessage(input.message) || Boolean(detectAttendanceIntent(input.message))
    );
  }

  detectIntent(message: string, priorSlots?: SlotBag): string | undefined {
    const detected = detectAttendanceIntent(message);
    if (detected) return detected.intent;
    const prior = asAttendanceSlots(priorSlots ?? {});
    if (prior.date || prior.reason) return 'employee.attendance.regularize';
    return undefined;
  }

  extractEntities(input: CapabilityTurnInput): SlotBag {
    const prior = asAttendanceSlots(input.priorSlots ?? {});
    const extracted = extractAttendanceEntities(input.message, prior, input.now);
    return toSlotBag(mergeAttendanceSlots(prior, extracted));
  }

  missingSlots(intent: string, slots: SlotBag): readonly string[] {
    return missingSlotsForIntent(intent as AttendanceIntent, asAttendanceSlots(slots));
  }

  validate(
    input: CapabilityTurnInput & { readonly slots: SlotBag; readonly intent: string },
  ): ValidationResult {
    const extras = input.extras ?? {};
    const issues = validateAttendanceSlots({
      intent: input.intent as AttendanceIntent,
      slots: asAttendanceSlots(input.slots),
      ...(input.now ? { now: input.now } : {}),
      ...(extras['today'] ? { today: extras['today'] as AttendanceTodaySnapshot } : {}),
      ...(extras['holidays'] ? { holidays: extras['holidays'] as string[] } : {}),
      ...(extras['requireLocationForClockIn']
        ? { requireLocationForClockIn: Boolean(extras['requireLocationForClockIn']) }
        : {}),
    });
    const mapped: ValidationIssue[] = issues.map((i) => ({
      code: i.code,
      message: i.message,
      ...(i.field ? { field: i.field } : {}),
      severity: i.code === 'WEEKEND' ? 'warning' : 'error',
    }));
    // Treat location required as clarify-friendly error
    const errors = mapped.filter((i) => i.severity === 'error');
    return { ok: errors.length === 0, issues: mapped };
  }

  clarify(input: {
    readonly intent: string;
    readonly missing: readonly string[];
    readonly slots: SlotBag;
  }): ClarificationResult {
    const first = input.missing[0] ?? 'details';
    const ask = clarificationQuestion(first);
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
    const slots = asAttendanceSlots(input.slots);
    const bag = toSlotBag(slots);
    const detected = detectAttendanceIntent(input.message);
    const toolName =
      (detected?.toolName as AttendanceToolName | undefined) ??
      this.toolForIntent(input.intent as AttendanceIntent);
    if (!toolName) return null;

    if (toolName === 'clockIn') {
      return {
        intent: input.intent,
        toolName: 'clockIn',
        arguments: {
          ...(slots.location ? { location: slots.location } : {}),
          ...(slots.shift ? { shift: slots.shift } : {}),
        },
        requiresConfirmation: false,
        slots: bag,
        risk: 'low',
      };
    }

    if (toolName === 'clockOut') {
      return {
        intent: input.intent,
        toolName: 'clockOut',
        arguments: {},
        requiresConfirmation: true,
        slots: bag,
        risk: 'medium',
      };
    }

    if (toolName === 'attendanceRegularization') {
      return {
        intent: input.intent,
        toolName: 'attendanceRegularization',
        arguments: {
          date: slots.date,
          reason: slots.reason,
          ...(slots.halfDay !== undefined ? { halfDay: slots.halfDay } : {}),
        },
        requiresConfirmation: true,
        slots: bag,
        risk: 'medium',
      };
    }

    if (toolName === 'attendanceHistory') {
      const args: Record<string, unknown> = {};
      if (slots.startDate) args.fromDate = slots.startDate;
      if (slots.endDate) args.toDate = slots.endDate;
      if (input.intent === 'employee.attendance.late') args.status = 'late';
      return {
        intent: input.intent,
        toolName: 'attendanceHistory',
        arguments: args,
        requiresConfirmation: false,
        slots: bag,
        risk: 'low',
      };
    }

    if (toolName === 'attendanceSummary' || toolName === 'workingHours') {
      const now = input.now ?? new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      return {
        intent: input.intent,
        toolName,
        arguments: {
          month,
          ...(input.intent === 'employee.attendance.wfh' ? { type: 'wfh' } : {}),
        },
        requiresConfirmation: false,
        slots: bag,
        risk: 'low',
      };
    }

    return {
      intent: input.intent,
      toolName,
      arguments: {},
      requiresConfirmation: false,
      slots: bag,
      risk: 'low',
    };
  }

  buildConfirmation(input: {
    readonly plan: ExecutionPlan;
    readonly slots: SlotBag;
    readonly extras?: Readonly<Record<string, unknown>>;
  }): ConfirmationDraft | null {
    if (!input.plan.requiresConfirmation) return null;
    const slots = asAttendanceSlots(input.slots);
    let summary: string;
    if (input.plan.toolName === 'clockOut') {
      summary = buildClockOutConfirmationSummary(
        input.extras?.['today'] as AttendanceTodaySnapshot | undefined,
      );
    } else if (input.plan.toolName === 'attendanceRegularization') {
      summary = buildRegularizeConfirmationSummary(slots);
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
      return { kind: 'failed', message: 'That attendance action is not available yet.' };
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
      return { kind: 'failed', message: result.errorMessage ?? 'Attendance tool failed.' };
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
    return textResponse(formatAttendanceToolResult(input.toolName, input.toolResult));
  }

  dashboardWidgets(): readonly DashboardWidgetDef[] {
    return [
      {
        id: 'attendance.today',
        title: 'Attendance Today',
        route: '/app/employee/attendance',
        order: 15,
        requiredPermissions: ['attendance.read'],
      },
      {
        id: 'attendance.checkin',
        title: 'Check-in Time',
        route: '/app/employee/attendance',
        order: 16,
        requiredPermissions: ['attendance.read'],
      },
      {
        id: 'attendance.hours',
        title: 'Working Hours',
        route: '/app/employee/attendance',
        order: 17,
        requiredPermissions: ['attendance.read'],
      },
      {
        id: 'attendance.summary',
        title: 'Attendance Summary',
        route: '/app/employee/attendance',
        order: 18,
        requiredPermissions: ['attendance.read'],
      },
      {
        id: 'attendance.calendar',
        title: 'Monthly Calendar',
        route: '/app/employee/attendance/calendar',
        order: 19,
        requiredPermissions: ['attendance.read'],
      },
      {
        id: 'attendance.quick_actions',
        title: 'Attendance Quick Actions',
        route: '/app/ai',
        order: 20,
        requiredPermissions: ['attendance.clockin'],
      },
    ];
  }

  suggestedPrompts(): readonly SuggestedPromptDef[] {
    return [
      {
        id: 'attendance.today',
        label: 'Today status',
        prompt: 'Am I checked in today?',
        kind: 'starter',
      },
      {
        id: 'attendance.clockin',
        label: 'Clock in',
        prompt: 'Clock me in',
        kind: 'quick_action',
      },
      {
        id: 'attendance.clockout',
        label: 'Clock out',
        prompt: 'Clock me out',
        kind: 'quick_action',
      },
      {
        id: 'attendance.summary',
        label: 'Summary',
        prompt: 'Show my attendance summary',
        kind: 'dashboard',
      },
      {
        id: 'attendance.history',
        label: 'History',
        prompt: "Show this month's attendance",
        kind: 'follow_up',
      },
    ];
  }

  helpExamples(): CapabilityHelp {
    return {
      description: this.description,
      examples: [
        'Am I checked in today?',
        'Clock me in',
        'Clock me out',
        'Regularize my attendance for yesterday',
        'How many WFH days did I use?',
      ],
      supportedActions: [...this.supportedTools],
      limitations: [
        'Does not manage team attendance (Manager Agent).',
        'Uses Tool Registry / MCP only — no direct HRIS calls.',
      ],
      requiredPermissions: [...this.requiredPermissions],
    };
  }

  telemetry(): CapabilityTelemetryDescriptor {
    return { capabilityId: this.id, metricsPrefix: 'ess.attendance' };
  }

  process(input: AttendanceCapabilityInput): AttendanceCapabilityOutcome {
    const detected = detectAttendanceIntent(input.message);
    if (!detected && !isAttendanceRelatedMessage(input.message) && !input.priorSlots) {
      return {
        kind: 'unsupported',
        message:
          'I can help with attendance today, history, summary, clock in/out, shifts, and regularization.',
      };
    }

    const prior = input.priorSlots ?? {};
    const inferredIntent =
      detected ??
      (prior.date || prior.reason
        ? {
            intent: 'employee.attendance.regularize' as const,
            toolName: 'attendanceRegularization' as const,
            requiresConfirmation: true,
          }
        : null);

    if (!inferredIntent) {
      return {
        kind: 'unsupported',
        message:
          'Could you clarify whether you want today’s status, history, clock in/out, or regularization?',
      };
    }

    const slots = asAttendanceSlots(
      this.extractEntities({
        message: input.message,
        intent: inferredIntent.intent,
        priorSlots: toSlotBag(prior),
        ...(input.now ? { now: input.now } : {}),
      }),
    );

    const missing = [...this.missingSlots(inferredIntent.intent, toSlotBag(slots))];

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
        ...(input.today ? { today: input.today } : {}),
        ...(input.holidays ? { holidays: input.holidays } : {}),
      },
    });
    const blocking = validation.issues.filter((i) => i.severity !== 'warning');
    // LOCATION_REQUIRED → clarify instead of hard fail
    const locationIssue = blocking.find((i) => i.code === 'LOCATION_REQUIRED');
    if (locationIssue) {
      const clarification = this.clarify({
        intent: inferredIntent.intent,
        missing: ['location'],
        slots: toSlotBag(slots),
      });
      return {
        kind: 'clarify',
        intent: inferredIntent.intent,
        question: clarification.question,
        missing: ['location'],
        slots,
        ...(clarification.suggestedReplies
          ? { suggestedReplies: clarification.suggestedReplies }
          : {}),
      };
    }
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
        suggestedReplies: ['Am I checked in today?', 'Show my attendance summary'],
      };
    }

    const plan = this.buildExecutionPlan({
      message: input.message,
      intent: inferredIntent.intent,
      slots: toSlotBag(slots),
      ...(input.now ? { now: input.now } : {}),
    });
    if (!plan) {
      return { kind: 'unsupported', message: 'Could not plan that attendance action.' };
    }

    const confirmation = this.buildConfirmation({
      plan,
      slots: toSlotBag(slots),
      extras: {
        ...(input.today ? { today: input.today } : {}),
      },
    });

    return {
      kind: 'ready',
      intent: inferredIntent.intent,
      toolName: plan.toolName as AttendanceToolName,
      arguments: plan.arguments,
      slots,
      requiresConfirmation: plan.requiresConfirmation,
      ...(confirmation?.summary ? { confirmationSummary: confirmation.summary } : {}),
    };
  }

  private toolForIntent(intent: AttendanceIntent): AttendanceToolName | undefined {
    switch (intent) {
      case 'employee.attendance.today':
      case 'employee.attendance.absent':
        return 'attendanceToday';
      case 'employee.attendance.history':
      case 'employee.attendance.late':
        return 'attendanceHistory';
      case 'employee.attendance.summary':
      case 'employee.attendance.wfh':
        return 'attendanceSummary';
      case 'employee.attendance.clock_in':
        return 'clockIn';
      case 'employee.attendance.clock_out':
        return 'clockOut';
      case 'employee.attendance.regularize':
        return 'attendanceRegularization';
      case 'employee.attendance.shift':
        return 'shiftSchedule';
      case 'employee.attendance.hours':
        return 'workingHours';
      default:
        return undefined;
    }
  }
}

export function createAttendanceCapability(): AttendanceCapability {
  return new AttendanceCapability();
}

function formatAttendanceToolResult(toolName: string | undefined, toolResult: unknown): string {
  if (toolName === 'attendanceToday' && toolResult && typeof toolResult === 'object') {
    const data = toolResult as AttendanceTodaySnapshot;
    const lines = [`Attendance for ${data.date}: ${data.status.replace(/_/g, ' ')}`];
    if (data.checkInAt) lines.push(`Check-in: ${data.checkInAt}`);
    if (data.checkOutAt) lines.push(`Check-out: ${data.checkOutAt}`);
    if (data.workingHours !== undefined) lines.push(`Working hours: ${data.workingHours}`);
    if (data.late) lines.push('Marked late.');
    if (data.wfh) lines.push('WFH day.');
    return lines.join('\n');
  }
  if (toolName === 'attendanceHistory' && toolResult && typeof toolResult === 'object') {
    const data = toolResult as {
      items?: Array<{ date: string; status: string; checkInAt?: string; checkOutAt?: string }>;
    };
    if (data.items?.length) {
      return `Attendance history:\n${data.items
        .map(
          (i) =>
            `• ${i.date} — ${i.status}${i.checkInAt ? ` (in ${i.checkInAt}` : ''}${i.checkOutAt ? `, out ${i.checkOutAt})` : i.checkInAt ? ')' : ''}`,
        )
        .join('\n')}`;
    }
    return 'No attendance records found for this period.';
  }
  if (toolName === 'attendanceSummary' && toolResult && typeof toolResult === 'object') {
    const data = toolResult as {
      presentDays?: number;
      absentDays?: number;
      lateDays?: number;
      wfhDays?: number;
      workingDays?: number;
    };
    return [
      'Attendance summary:',
      `• Present: ${data.presentDays ?? 0}`,
      `• Absent: ${data.absentDays ?? 0}`,
      `• Late: ${data.lateDays ?? 0}`,
      `• WFH: ${data.wfhDays ?? 0}`,
      `• Working days: ${data.workingDays ?? 0}`,
    ].join('\n');
  }
  if (toolName === 'workingHours' && toolResult && typeof toolResult === 'object') {
    const data = toolResult as { totalHours?: number; averageHours?: number };
    return `Working hours: ${data.totalHours ?? 0} total (avg ${data.averageHours ?? 0}/day).`;
  }
  if (toolName === 'shiftSchedule' && toolResult && typeof toolResult === 'object') {
    const data = toolResult as { shift?: string; start?: string; end?: string };
    return `Your shift: ${data.shift ?? 'General'} (${data.start ?? '09:00'} – ${data.end ?? '18:00'}).`;
  }
  if (toolName === 'clockIn' && toolResult && typeof toolResult === 'object') {
    const data = toolResult as { checkInAt?: string; status?: string };
    return `Checked in at ${data.checkInAt ?? 'now'}. Status: ${data.status ?? 'checked_in'}.`;
  }
  if (toolName === 'clockOut' && toolResult && typeof toolResult === 'object') {
    const data = toolResult as { checkOutAt?: string; workingHours?: number };
    return `Checked out at ${data.checkOutAt ?? 'now'}${data.workingHours !== undefined ? ` (${data.workingHours}h)` : ''}.`;
  }
  if (toolName === 'attendanceRegularization' && toolResult && typeof toolResult === 'object') {
    const data = toolResult as { requestId?: string; status?: string };
    return `Regularization ${data.requestId ?? ''} submitted (${data.status ?? 'pending'}).`.trim();
  }
  return 'Done.';
}

export function formatAttendanceAssistantMessage(
  outcome: AttendanceCapabilityOutcome,
  toolResult?: unknown,
): string {
  if (outcome.kind === 'clarify') return outcome.question;
  if (outcome.kind === 'invalid') return outcome.message;
  if (outcome.kind === 'unsupported') return outcome.message;
  return formatAttendanceToolResult(outcome.toolName, toolResult);
}

export type { AttendanceSlots };
