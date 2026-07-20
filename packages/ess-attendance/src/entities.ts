import { resolveRelativeDatePhrase } from '@onecare/ess-capability';
import type { AttendanceSlots } from './types';

export function extractShift(message: string): string | undefined {
  const match = message.match(/\b(shift\s*[a-c]|morning|evening|night)\b/i);
  return match?.[1]?.replace(/\s+/g, ' ');
}

export function extractLocation(message: string): string | undefined {
  const match = message.match(/\b(?:at|from|location)\s+([A-Za-z][A-Za-z0-9\s-]{1,40})$/i);
  if (!match?.[1]) return undefined;
  const value = match[1].trim();
  if (/^(tomorrow|today|yesterday|home|office)$/i.test(value) && value.split(/\s+/).length === 1) {
    if (/^(home|office)$/i.test(value))
      return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }
  if (/\b(office|home|wfh|remote)\b/i.test(message)) {
    if (/\bwfh\b|\bwork from home\b|\bremote\b/i.test(message)) return 'Home';
    if (/\boffice\b/i.test(message)) return 'Office';
  }
  return value.slice(0, 80);
}

export function extractReason(message: string): string | undefined {
  const match = message.match(/\b(?:reason|because|why|for)\s*[:-]?\s*(.+)$/i);
  if (!match?.[1]) return undefined;
  const reason = match[1].trim();
  if (/^(tomorrow|today|yesterday|clock|check)\b/i.test(reason) && reason.split(/\s+/).length < 3) {
    return undefined;
  }
  return reason.slice(0, 1000);
}

export function extractHalfDay(message: string): boolean | undefined {
  if (/\bhalf[\s-]?day\b/i.test(message)) return true;
  if (/\bfull[\s-]?day\b/i.test(message)) return false;
  return undefined;
}

export function extractAttendanceEntities(
  message: string,
  prior: AttendanceSlots = {},
  now: Date = new Date(),
): AttendanceSlots {
  const range = resolveRelativeDatePhrase(message, now);
  let reason = extractReason(message) ?? prior.reason;
  const shift = extractShift(message) ?? prior.shift;
  const location = extractLocation(message) ?? prior.location;
  const halfDay = extractHalfDay(message) ?? prior.halfDay;

  if (
    !reason &&
    prior.date &&
    !range &&
    !extractShift(message) &&
    !extractLocation(message) &&
    message.trim().length > 0 &&
    !/^(show|list|clock|check|what|which|how|am i)\b/i.test(message.trim())
  ) {
    reason = message.trim().slice(0, 1000);
  }

  const date = range?.startDate ?? prior.date;
  return {
    ...(date ? { date } : {}),
    ...(prior.startDate || range?.startDate
      ? { startDate: range?.startDate ?? prior.startDate }
      : {}),
    ...(prior.endDate || range?.endDate ? { endDate: range?.endDate ?? prior.endDate } : {}),
    ...(reason ? { reason } : {}),
    ...(shift ? { shift } : {}),
    ...(location ? { location } : {}),
    ...(halfDay !== undefined ? { halfDay } : {}),
    ...(prior.statusFilter ? { statusFilter: prior.statusFilter } : {}),
  };
}

export function mergeAttendanceSlots(
  prior: AttendanceSlots,
  next: AttendanceSlots,
): AttendanceSlots {
  return {
    ...(prior.date || next.date ? { date: next.date ?? prior.date } : {}),
    ...(prior.startDate || next.startDate ? { startDate: next.startDate ?? prior.startDate } : {}),
    ...(prior.endDate || next.endDate ? { endDate: next.endDate ?? prior.endDate } : {}),
    ...(prior.reason || next.reason ? { reason: next.reason ?? prior.reason } : {}),
    ...(prior.shift || next.shift ? { shift: next.shift ?? prior.shift } : {}),
    ...(prior.location || next.location ? { location: next.location ?? prior.location } : {}),
    ...(prior.halfDay !== undefined || next.halfDay !== undefined
      ? { halfDay: next.halfDay ?? prior.halfDay }
      : {}),
    ...(prior.statusFilter || next.statusFilter
      ? { statusFilter: next.statusFilter ?? prior.statusFilter }
      : {}),
  };
}
