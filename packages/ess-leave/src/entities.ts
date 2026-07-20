import { resolveRelativeDatePhrase } from './dates';
import type { LeaveSlots } from './types';

const LEAVE_TYPE_ALIASES: Record<string, string> = {
  casual: 'Casual',
  causal: 'Casual',
  sick: 'Sick',
  annual: 'Annual',
  earned: 'Annual',
  privilege: 'Privilege',
  unpaid: 'Unpaid',
  maternity: 'Maternity',
  paternity: 'Paternity',
};

export function extractLeaveType(message: string): string | undefined {
  const lower = message.toLowerCase();
  for (const [alias, canonical] of Object.entries(LEAVE_TYPE_ALIASES)) {
    if (new RegExp(`\\b${alias}\\b`, 'i').test(lower)) {
      return canonical;
    }
  }
  const explicit = message.match(/\b(?:leave type|type)\s*[:=]?\s*([A-Za-z]+)/i);
  if (explicit?.[1]) {
    const key = explicit[1].toLowerCase();
    return LEAVE_TYPE_ALIASES[key] ?? capitalize(explicit[1]);
  }
  return undefined;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export function extractReason(message: string): string | undefined {
  const match = message.match(/\b(?:reason|because|for)\s*[:-]?\s*(.+)$/i);
  if (!match?.[1]) return undefined;
  const reason = match[1].trim();
  if (
    /^(tomorrow|today|next|casual|sick|annual)\b/i.test(reason) &&
    reason.split(/\s+/).length < 3
  ) {
    return undefined;
  }
  return reason.slice(0, 1000);
}

export function extractRequestId(message: string): string | undefined {
  const match = message.match(/\b(?:request\s*)?(?:id|#)?\s*(leave-[a-z0-9-]+)\b/i);
  return match?.[1];
}

export function extractHalfDay(message: string): boolean | undefined {
  if (/\bhalf[\s-]?day\b/i.test(message)) return true;
  if (/\bfull[\s-]?day\b/i.test(message)) return false;
  return undefined;
}

export function extractLeaveEntities(
  message: string,
  prior: LeaveSlots = {},
  now: Date = new Date(),
): LeaveSlots {
  const range = resolveRelativeDatePhrase(message, now);
  const leaveType = extractLeaveType(message) ?? prior.leaveType;
  let reason = extractReason(message) ?? prior.reason;
  const requestId = extractRequestId(message) ?? prior.requestId;
  const halfDay = extractHalfDay(message) ?? prior.halfDay;

  // Clarification turn: free-text answer for missing reason
  if (
    !reason &&
    prior.startDate &&
    prior.endDate &&
    prior.leaveType &&
    !range &&
    !extractLeaveType(message) &&
    !extractRequestId(message) &&
    message.trim().length > 0 &&
    !/^(show|list|cancel|apply|what|which|how)\b/i.test(message.trim())
  ) {
    reason = message.trim().slice(0, 1000);
  }

  return {
    ...(prior.startDate || range?.startDate
      ? { startDate: range?.startDate ?? prior.startDate }
      : {}),
    ...(prior.endDate || range?.endDate ? { endDate: range?.endDate ?? prior.endDate } : {}),
    ...(leaveType ? { leaveType } : {}),
    ...(reason ? { reason } : {}),
    ...(requestId ? { requestId } : {}),
    ...(halfDay !== undefined ? { halfDay } : {}),
    ...(prior.statusFilter ? { statusFilter: prior.statusFilter } : {}),
  };
}

export function mergeSlots(prior: LeaveSlots, next: LeaveSlots): LeaveSlots {
  return {
    ...(prior.startDate || next.startDate ? { startDate: next.startDate ?? prior.startDate } : {}),
    ...(prior.endDate || next.endDate ? { endDate: next.endDate ?? prior.endDate } : {}),
    ...(prior.leaveType || next.leaveType ? { leaveType: next.leaveType ?? prior.leaveType } : {}),
    ...(prior.reason || next.reason ? { reason: next.reason ?? prior.reason } : {}),
    ...(prior.requestId || next.requestId ? { requestId: next.requestId ?? prior.requestId } : {}),
    ...(prior.halfDay !== undefined || next.halfDay !== undefined
      ? { halfDay: next.halfDay ?? prior.halfDay }
      : {}),
    ...(prior.durationDays || next.durationDays
      ? { durationDays: next.durationDays ?? prior.durationDays }
      : {}),
    ...(prior.statusFilter || next.statusFilter
      ? { statusFilter: next.statusFilter ?? prior.statusFilter }
      : {}),
  };
}
