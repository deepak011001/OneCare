import { parseIsoDate, toIsoDate } from '@onecare/ess-capability';
import type {
  AttendanceIntent,
  AttendanceSlots,
  AttendanceTodaySnapshot,
  AttendanceValidationIssue,
} from './types';

export function missingSlotsForIntent(intent: AttendanceIntent, slots: AttendanceSlots): string[] {
  switch (intent) {
    case 'employee.attendance.regularize': {
      const missing: string[] = [];
      if (!slots.date) missing.push('date');
      if (!slots.reason) missing.push('reason');
      return missing;
    }
    case 'employee.attendance.clock_in':
      // Location optional unless product flag requires it — clarify only when prior asked
      return [];
    default:
      return [];
  }
}

export function clarificationQuestion(missing: string): {
  question: string;
  suggestedReplies?: readonly string[];
} {
  switch (missing) {
    case 'date':
      return {
        question: 'Which date should I regularize?',
        suggestedReplies: ['Yesterday', 'Today', 'Last Monday'],
      };
    case 'reason':
      return {
        question: 'What is the reason for regularization?',
        suggestedReplies: ['Forgot to check in', 'System issue', 'Network outage'],
      };
    case 'location':
      return {
        question: 'Which location should I use for check-in?',
        suggestedReplies: ['Office', 'Home'],
      };
    default:
      return { question: `Could you provide ${missing}?` };
  }
}

export function validateAttendanceSlots(input: {
  intent: AttendanceIntent;
  slots: AttendanceSlots;
  now?: Date;
  today?: AttendanceTodaySnapshot;
  holidays?: readonly string[];
  requireLocationForClockIn?: boolean;
}): readonly AttendanceValidationIssue[] {
  const issues: AttendanceValidationIssue[] = [];
  const now = input.now ?? new Date();
  const todayIso = toIsoDate(now);
  const { intent, slots } = input;

  if (intent === 'employee.attendance.clock_in') {
    if (input.today?.status === 'checked_in' || input.today?.status === 'checked_out') {
      issues.push({
        code: 'ALREADY_CHECKED_IN',
        message: 'You are already checked in for today.',
      });
    }
    if (input.today?.status === 'holiday') {
      issues.push({
        code: 'HOLIDAY',
        message: 'Today is a holiday — attendance punch is not required.',
      });
    }
    if (input.today?.status === 'weekend') {
      issues.push({
        code: 'WEEKEND',
        message: 'Today is a weekend. Confirm with HR if you still need to punch in.',
        field: 'date',
      });
    }
    if (input.requireLocationForClockIn && !slots.location) {
      issues.push({
        code: 'LOCATION_REQUIRED',
        message: 'Location is required to clock in.',
        field: 'location',
      });
    }
  }

  if (intent === 'employee.attendance.clock_out') {
    if (input.today?.status === 'checked_out') {
      issues.push({
        code: 'ALREADY_CHECKED_OUT',
        message: 'You have already checked out for today.',
      });
    }
    if (input.today?.status === 'not_started' || input.today?.status === 'absent') {
      issues.push({
        code: 'NOT_CHECKED_IN',
        message: 'You are not checked in, so I cannot clock you out yet.',
      });
    }
  }

  if (intent === 'employee.attendance.regularize') {
    if (!slots.date) {
      issues.push({
        code: 'DATE_REQUIRED',
        message: 'A date is required to regularize attendance.',
        field: 'date',
      });
      return issues;
    }
    if (!parseIsoDate(slots.date)) {
      issues.push({
        code: 'INVALID_DATE',
        message: 'Date must be a valid YYYY-MM-DD value.',
        field: 'date',
      });
      return issues;
    }
    if (slots.date > todayIso) {
      issues.push({
        code: 'FUTURE_DATE',
        message: 'You cannot regularize a future date.',
        field: 'date',
      });
    }
    if (input.holidays?.includes(slots.date)) {
      issues.push({
        code: 'HOLIDAY',
        message: 'That date is a holiday.',
        field: 'date',
      });
    }
    const day = parseIsoDate(slots.date);
    if (day && (day.getDay() === 0 || day.getDay() === 6)) {
      issues.push({
        code: 'WEEKEND',
        message: 'That date falls on a weekend.',
        field: 'date',
      });
    }
    if (!slots.reason) {
      issues.push({
        code: 'REASON_REQUIRED',
        message: 'A reason is required for attendance regularization.',
        field: 'reason',
      });
    }
  }

  return issues;
}

export function buildClockOutConfirmationSummary(today?: AttendanceTodaySnapshot): string {
  const lines = ['Clock out for today'];
  if (today?.checkInAt) lines.push(`Checked in: ${today.checkInAt}`);
  lines.push('Confirm?');
  return lines.join('\n');
}

export function buildRegularizeConfirmationSummary(slots: AttendanceSlots): string {
  return [
    'Regularize attendance',
    `Date: ${slots.date ?? 'unknown'}`,
    ...(slots.reason ? [`Reason: ${slots.reason}`] : []),
    'Confirm?',
  ].join('\n');
}
