import { countWeekdaysInclusive, listDatesInclusive, parseIsoDate, toIsoDate } from './dates';
import type {
  HolidayItem,
  LeaveBalanceItem,
  LeaveIntent,
  LeaveSlots,
  LeaveValidationIssue,
} from './types';

export function missingSlotsForIntent(intent: LeaveIntent, slots: LeaveSlots): string[] {
  switch (intent) {
    case 'employee.leave.apply': {
      const missing: string[] = [];
      if (!slots.startDate) missing.push('startDate');
      if (!slots.endDate) missing.push('endDate');
      if (!slots.leaveType) missing.push('leaveType');
      if (!slots.reason) missing.push('reason');
      return missing;
    }
    case 'employee.leave.cancel':
      return slots.requestId ? [] : ['requestId'];
    default:
      return [];
  }
}

export function clarificationQuestion(
  missing: string,
  _slots: LeaveSlots,
): {
  question: string;
  suggestedReplies?: readonly string[];
} {
  switch (missing) {
    case 'startDate':
    case 'endDate':
      return {
        question: 'Which date should I use for the leave?',
        suggestedReplies: ['Tomorrow', 'Next Friday', 'Monday to Wednesday'],
      };
    case 'leaveType':
      return {
        question: 'Which leave type should I apply?',
        suggestedReplies: ['Casual', 'Sick', 'Annual'],
      };
    case 'reason':
      return {
        question: 'What reason should I include with the leave request?',
        suggestedReplies: ['Personal', 'Family function', 'Medical'],
      };
    case 'requestId':
      return {
        question:
          'Which leave request should I cancel? Share the request id, or ask me to show leave history.',
        suggestedReplies: ['Show my leave history'],
      };
    default:
      return { question: `Could you provide ${missing}?` };
  }
}

export function validateLeaveSlots(input: {
  intent: LeaveIntent;
  slots: LeaveSlots;
  now?: Date;
  balances?: readonly LeaveBalanceItem[];
  holidays?: readonly HolidayItem[];
  leaveTypes?: readonly string[];
  allowPastDates?: boolean;
}): readonly LeaveValidationIssue[] {
  const issues: LeaveValidationIssue[] = [];
  const now = input.now ?? new Date();
  const todayIso = toIsoDate(now);
  const { slots, intent } = input;

  if (intent === 'employee.leave.apply') {
    if (!slots.startDate || !slots.endDate) {
      issues.push({
        code: 'DATES_REQUIRED',
        message: 'Start and end dates are required.',
        field: 'startDate',
      });
      return issues;
    }
    const start = parseIsoDate(slots.startDate);
    const end = parseIsoDate(slots.endDate);
    if (!start || !end) {
      issues.push({ code: 'INVALID_DATE', message: 'Dates must be valid YYYY-MM-DD values.' });
      return issues;
    }
    if (end < start) {
      issues.push({
        code: 'DATE_ORDER',
        message: 'End date must be on or after the start date.',
        field: 'endDate',
      });
    }
    if (!input.allowPastDates && slots.startDate < todayIso) {
      issues.push({
        code: 'PAST_DATE',
        message: 'Leave cannot start in the past.',
        field: 'startDate',
      });
    }

    if (slots.leaveType && input.leaveTypes && input.leaveTypes.length > 0) {
      const ok = input.leaveTypes.some((t) => t.toLowerCase() === slots.leaveType!.toLowerCase());
      if (!ok) {
        issues.push({
          code: 'INVALID_LEAVE_TYPE',
          message: `Leave type "${slots.leaveType}" is not available.`,
          field: 'leaveType',
        });
      }
    }

    if (input.holidays && input.holidays.length > 0) {
      const holidaySet = new Set(input.holidays.map((h) => h.date));
      const overlap = listDatesInclusive(slots.startDate, slots.endDate).filter((d) =>
        holidaySet.has(d),
      );
      if (overlap.length > 0) {
        issues.push({
          code: 'HOLIDAY_CONFLICT',
          message: `Selected dates include holiday(s): ${overlap.join(', ')}.`,
          field: 'startDate',
        });
      }
    }

    if (slots.leaveType && input.balances) {
      const balance = input.balances.find(
        (b) => b.leaveType.toLowerCase() === slots.leaveType!.toLowerCase(),
      );
      const needed = slots.halfDay
        ? 0.5
        : countWeekdaysInclusive(slots.startDate, slots.endDate) || 1;
      if (balance && balance.available < needed) {
        issues.push({
          code: 'INSUFFICIENT_BALANCE',
          message: `Not enough ${slots.leaveType} leave. Available: ${balance.available}, needed: ${needed}.`,
          field: 'leaveType',
        });
      }
    }

    // Weekend-only range warning as soft validation
    const weekdays = countWeekdaysInclusive(slots.startDate, slots.endDate);
    if (weekdays === 0) {
      issues.push({
        code: 'WEEKEND_ONLY',
        message: 'The selected range falls only on weekend days.',
        field: 'startDate',
      });
    }
  }

  if (intent === 'employee.leave.cancel' && !slots.requestId) {
    issues.push({
      code: 'REQUEST_ID_REQUIRED',
      message: 'A leave request id is required to cancel.',
      field: 'requestId',
    });
  }

  return issues;
}

export function buildApplyConfirmationSummary(slots: LeaveSlots, balanceAfter?: number): string {
  const lines = [
    `Apply ${slots.leaveType ?? 'Leave'}`,
    `Date: ${slots.startDate}${slots.endDate && slots.endDate !== slots.startDate ? ` to ${slots.endDate}` : ''}`,
  ];
  if (slots.halfDay) lines.push('Half day: yes');
  if (slots.reason) lines.push(`Reason: ${slots.reason}`);
  if (balanceAfter !== undefined) lines.push(`Balance after leave: ${balanceAfter}`);
  lines.push('Confirm?');
  return lines.join('\n');
}

export function buildCancelConfirmationSummary(slots: LeaveSlots): string {
  return [`Cancel leave request`, `Request: ${slots.requestId ?? 'unknown'}`, 'Confirm?'].join(
    '\n',
  );
}
