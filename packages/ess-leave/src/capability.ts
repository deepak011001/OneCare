import { countWeekdaysInclusive } from './dates';
import { extractLeaveEntities, mergeSlots } from './entities';
import { detectLeaveIntent, isLeaveRelatedMessage } from './intents';
import {
  buildApplyConfirmationSummary,
  buildCancelConfirmationSummary,
  clarificationQuestion,
  missingSlotsForIntent,
  validateLeaveSlots,
} from './validation';
import type { LeaveCapabilityInput, LeaveCapabilityOutcome, LeaveSlots } from './types';

export class LeaveCapability {
  process(input: LeaveCapabilityInput): LeaveCapabilityOutcome {
    const detected = detectLeaveIntent(input.message);
    if (!detected && !isLeaveRelatedMessage(input.message) && !input.priorSlots) {
      return {
        kind: 'unsupported',
        message: 'I can help with leave balance, history, apply, cancel, types, and holidays.',
      };
    }

    // Continue prior apply/cancel clarification when user answers with entities only
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

    const extracted = extractLeaveEntities(input.message, prior, input.now);
    const slots = mergeSlots(prior, extracted);

    // "enough sick leave" → balance check with type filter context
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

    const missing = missingSlotsForIntent(inferredIntent.intent, slots);
    if (missing.length > 0) {
      const first = missing[0]!;
      const ask = clarificationQuestion(first, slots);
      return {
        kind: 'clarify',
        intent: inferredIntent.intent,
        question: ask.question,
        missing,
        slots,
        ...(ask.suggestedReplies ? { suggestedReplies: ask.suggestedReplies } : {}),
      };
    }

    const issues = validateLeaveSlots({
      intent: inferredIntent.intent,
      slots,
      ...(input.now ? { now: input.now } : {}),
      ...(input.balances ? { balances: input.balances } : {}),
      ...(input.holidays ? { holidays: input.holidays } : {}),
      ...(input.leaveTypes ? { leaveTypes: input.leaveTypes } : {}),
    });
    const blocking = issues.filter((i) => i.code !== 'WEEKEND_ONLY');
    if (blocking.length > 0) {
      return {
        kind: 'invalid',
        intent: inferredIntent.intent,
        message: blocking.map((i) => i.message).join(' '),
        issues: blocking,
        suggestedReplies: ['Check my leave balance', 'Show leave types'],
      };
    }

    if (inferredIntent.toolName === 'applyLeave') {
      const needed = slots.halfDay
        ? 0.5
        : countWeekdaysInclusive(slots.startDate!, slots.endDate!) || 1;
      const balance = input.balances?.find(
        (b) => b.leaveType.toLowerCase() === (slots.leaveType ?? '').toLowerCase(),
      );
      const balanceAfter =
        balance !== undefined ? Math.max(0, balance.available - needed) : undefined;
      const args: Record<string, unknown> = {
        startDate: slots.startDate,
        endDate: slots.endDate,
        leaveType: slots.leaveType,
        ...(slots.reason ? { reason: slots.reason } : {}),
        ...(slots.halfDay !== undefined ? { halfDay: slots.halfDay } : {}),
      };
      return {
        kind: 'ready',
        intent: inferredIntent.intent,
        toolName: 'applyLeave',
        arguments: args,
        slots,
        requiresConfirmation: true,
        confirmationSummary: buildApplyConfirmationSummary(slots, balanceAfter),
      };
    }

    if (inferredIntent.toolName === 'cancelLeave') {
      return {
        kind: 'ready',
        intent: inferredIntent.intent,
        toolName: 'cancelLeave',
        arguments: {
          requestId: slots.requestId,
          ...(slots.reason ? { reason: slots.reason } : {}),
        },
        slots,
        requiresConfirmation: true,
        confirmationSummary: buildCancelConfirmationSummary(slots),
      };
    }

    if (inferredIntent.toolName === 'leaveHistory') {
      const args: Record<string, unknown> = {};
      if (slots.startDate) args.fromDate = slots.startDate;
      if (slots.endDate) args.toDate = slots.endDate;
      if (inferredIntent.intent === 'employee.leave.status') args.status = 'pending_approval';
      return {
        kind: 'ready',
        intent: inferredIntent.intent,
        toolName: 'leaveHistory',
        arguments: args,
        slots,
        requiresConfirmation: false,
      };
    }

    if (inferredIntent.toolName === 'holidayCalendar') {
      const now = input.now ?? new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      return {
        kind: 'ready',
        intent: inferredIntent.intent,
        toolName: 'holidayCalendar',
        arguments: { month },
        slots,
        requiresConfirmation: false,
      };
    }

    return {
      kind: 'ready',
      intent: inferredIntent.intent,
      toolName: inferredIntent.toolName,
      arguments: {},
      slots,
      requiresConfirmation: false,
    };
  }
}

export function createLeaveCapability(): LeaveCapability {
  return new LeaveCapability();
}

export function formatLeaveAssistantMessage(
  outcome: LeaveCapabilityOutcome,
  toolResult?: unknown,
): string {
  if (outcome.kind === 'clarify') return outcome.question;
  if (outcome.kind === 'invalid') return outcome.message;
  if (outcome.kind === 'unsupported') return outcome.message;

  if (outcome.toolName === 'leaveBalance' && toolResult && typeof toolResult === 'object') {
    const data = toolResult as { balances?: Array<{ leaveType: string; available: number }> };
    if (data.balances?.length) {
      const lines = data.balances.map((b) => `• ${b.leaveType}: ${b.available} day(s)`);
      return `Here is your leave balance:\n${lines.join('\n')}`;
    }
  }
  if (outcome.toolName === 'leaveHistory' && toolResult && typeof toolResult === 'object') {
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
  if (outcome.toolName === 'leaveTypes' && toolResult && typeof toolResult === 'object') {
    const data = toolResult as { types?: Array<{ name: string }> | string[] };
    const names = Array.isArray(data.types)
      ? data.types.map((t) => (typeof t === 'string' ? t : t.name))
      : [];
    if (names.length) return `Available leave types: ${names.join(', ')}.`;
  }
  if (outcome.toolName === 'holidayCalendar' && toolResult && typeof toolResult === 'object') {
    const data = toolResult as { holidays?: Array<{ date: string; name: string }> };
    if (data.holidays?.length) {
      return `Upcoming holidays:\n${data.holidays.map((h) => `• ${h.date} — ${h.name}`).join('\n')}`;
    }
    return 'No holidays found for this period.';
  }
  if (outcome.toolName === 'applyLeave' && toolResult && typeof toolResult === 'object') {
    const data = toolResult as { requestId?: string; status?: string };
    return `Leave applied successfully. Request ${data.requestId ?? ''} is ${data.status ?? 'submitted'}.`.trim();
  }
  if (outcome.toolName === 'cancelLeave' && toolResult && typeof toolResult === 'object') {
    const data = toolResult as { requestId?: string; status?: string };
    return `Leave request ${data.requestId ?? ''} is ${data.status ?? 'cancelled'}.`;
  }
  return 'Done.';
}

export type { LeaveSlots };
