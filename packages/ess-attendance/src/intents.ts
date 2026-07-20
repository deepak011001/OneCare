import type { AttendanceIntent, AttendanceToolName } from './types';

interface IntentRule {
  readonly intent: AttendanceIntent;
  readonly toolName: AttendanceToolName;
  readonly patterns: readonly RegExp[];
  readonly requiresConfirmation: boolean;
  readonly priority: number;
}

const RULES: readonly IntentRule[] = [
  {
    intent: 'employee.attendance.clock_out',
    toolName: 'clockOut',
    patterns: [/\bclock\s*(me\s*)?out\b/i, /\bcheck\s*out\b/i, /\blog\s*out\b.*\b(work|office)\b/i],
    requiresConfirmation: true,
    priority: 100,
  },
  {
    intent: 'employee.attendance.clock_in',
    toolName: 'clockIn',
    patterns: [
      /\bclock\s*(me\s*)?in\b/i,
      /\bcheck\s*in\b/i,
      /\bmark\s+(my\s+)?attendance\b/i,
      /\bpunch\s*in\b/i,
    ],
    requiresConfirmation: false,
    priority: 95,
  },
  {
    intent: 'employee.attendance.regularize',
    toolName: 'attendanceRegularization',
    patterns: [
      /\bregularize\b/i,
      /\battendance\s+regularization\b/i,
      /\bfix\s+(my\s+)?attendance\b/i,
    ],
    requiresConfirmation: true,
    priority: 90,
  },
  {
    intent: 'employee.attendance.late',
    toolName: 'attendanceHistory',
    patterns: [/\bwas i late\b/i, /\blate\s+(yesterday|today|arrival)\b/i, /\blate arrivals?\b/i],
    requiresConfirmation: false,
    priority: 85,
  },
  {
    intent: 'employee.attendance.absent',
    toolName: 'attendanceToday',
    patterns: [/\bmarked absent\b/i, /\bwhy\s+.*\babsent\b/i, /\bam i absent\b/i],
    requiresConfirmation: false,
    priority: 80,
  },
  {
    intent: 'employee.attendance.wfh',
    toolName: 'attendanceSummary',
    patterns: [/\bwfh\b/i, /\bwork from home\b/i, /\bremote days?\b/i],
    requiresConfirmation: false,
    priority: 75,
  },
  {
    intent: 'employee.attendance.hours',
    toolName: 'workingHours',
    patterns: [
      /\bworking hours?\b/i,
      /\bhow many (hours|days) have i worked\b/i,
      /\bhours worked\b/i,
    ],
    requiresConfirmation: false,
    priority: 70,
  },
  {
    intent: 'employee.attendance.shift',
    toolName: 'shiftSchedule',
    patterns: [/\bshift\b/i, /\bschedule\b.*\b(shift|work)\b/i],
    requiresConfirmation: false,
    priority: 65,
  },
  {
    intent: 'employee.attendance.summary',
    toolName: 'attendanceSummary',
    patterns: [
      /\battendance summary\b/i,
      /\bmonthly attendance\b/i,
      /\bthis month'?s attendance\b/i,
    ],
    requiresConfirmation: false,
    priority: 60,
  },
  {
    intent: 'employee.attendance.history',
    toolName: 'attendanceHistory',
    patterns: [
      /\battendance history\b/i,
      /\bshow (this month'?s |my )?attendance\b/i,
      /\bpast attendance\b/i,
    ],
    requiresConfirmation: false,
    priority: 55,
  },
  {
    intent: 'employee.attendance.today',
    toolName: 'attendanceToday',
    patterns: [
      /\bam i checked in\b/i,
      /\btoday'?s attendance\b/i,
      /\battendance today\b/i,
      /\bwhat time did i check in\b/i,
      /\bwhat time did i check out\b/i,
      /\bchecked in today\b/i,
    ],
    requiresConfirmation: false,
    priority: 50,
  },
];

export interface DetectedAttendanceIntent {
  readonly intent: AttendanceIntent;
  readonly toolName: AttendanceToolName;
  readonly requiresConfirmation: boolean;
}

export function detectAttendanceIntent(message: string): DetectedAttendanceIntent | null {
  const matches = RULES.filter((rule) => rule.patterns.some((p) => p.test(message))).sort(
    (a, b) => b.priority - a.priority,
  );
  const top = matches[0];
  if (!top) return null;
  return {
    intent: top.intent,
    toolName: top.toolName,
    requiresConfirmation: top.requiresConfirmation,
  };
}

export function isAttendanceRelatedMessage(message: string): boolean {
  return (
    detectAttendanceIntent(message) !== null ||
    /\battendance\b/i.test(message) ||
    /\bclock\s*(in|out)\b/i.test(message) ||
    /\bcheck\s*(in|out)\b/i.test(message) ||
    /\bwfh\b/i.test(message)
  );
}
