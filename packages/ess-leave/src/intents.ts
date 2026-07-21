import type { LeaveIntent, LeaveToolName } from './types';

interface IntentRule {
  readonly intent: LeaveIntent;
  readonly toolName: LeaveToolName;
  readonly patterns: readonly RegExp[];
  readonly requiresConfirmation: boolean;
  readonly priority: number;
}

const RULES: readonly IntentRule[] = [
  {
    intent: 'employee.leave.cancel',
    toolName: 'cancelLeave',
    patterns: [/\bcancel\b.*\bleave\b/i, /\bleave\b.*\bcancel\b/i],
    requiresConfirmation: true,
    priority: 100,
  },
  {
    intent: 'employee.leave.apply',
    toolName: 'applyLeave',
    patterns: [
      /\bapply\b.*\bleave\b/i,
      /\bneed\s+leave\b/i,
      /\btake\s+leave\b/i,
      /\bbook\s+leave\b/i,
      /\brequest\s+leave\b/i,
    ],
    requiresConfirmation: true,
    priority: 90,
  },
  {
    intent: 'employee.leave.enough',
    toolName: 'leaveBalance',
    patterns: [/\benough\b.*\bleave\b/i, /\bdo i have\b.*\bleave\b/i, /\bsufficient\b.*\bleave\b/i],
    requiresConfirmation: false,
    priority: 85,
  },
  {
    intent: 'employee.leave.types',
    toolName: 'leaveTypes',
    patterns: [/\bleave types?\b/i, /\bwhich leave\b/i, /\bavailable leave types?\b/i],
    requiresConfirmation: false,
    priority: 80,
  },
  {
    intent: 'employee.leave.holidays',
    toolName: 'holidayCalendar',
    patterns: [/\bholidays?\b/i, /\bpublic holiday\b/i, /\bofficial holiday\b/i],
    requiresConfirmation: false,
    priority: 75,
  },
  {
    intent: 'employee.leave.status',
    toolName: 'leaveHistory',
    patterns: [
      /\bleave\b.*\bapproved\b/i,
      /\bwhen\b.*\bleave\b.*\bapproved\b/i,
      /\bstatus\b.*\bleave\b/i,
      /\bleave\b.*\bstatus\b/i,
    ],
    requiresConfirmation: false,
    priority: 70,
  },
  {
    intent: 'employee.leave.history',
    toolName: 'leaveHistory',
    patterns: [
      /\bleave history\b/i,
      /\brecent leave\b/i,
      /\bleave requests?\b/i,
      /\bpast leave\b/i,
    ],
    requiresConfirmation: false,
    priority: 65,
  },
  {
    intent: 'employee.leave.balance',
    toolName: 'leaveBalance',
    patterns: [
      /\bleave balance\b/i,
      /\bhow many leaves?\b/i,
      /\bhow much leave\b/i,
      /\bleaves? (do i|i) have\b/i,
      /\bbalance\b/i,
    ],
    requiresConfirmation: false,
    priority: 60,
  },
];

export interface DetectedLeaveIntent {
  readonly intent: LeaveIntent;
  readonly toolName: LeaveToolName;
  readonly requiresConfirmation: boolean;
}

export function detectLeaveIntent(message: string): DetectedLeaveIntent | null {
  if (isLeavePolicyKnowledgeQuestion(message)) {
    return null;
  }
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

/** Policy / handbook questions belong to Knowledge, not Leave tools. */
export function isLeavePolicyKnowledgeQuestion(message: string): boolean {
  return (
    /\b(leave|holiday)\b[\s\w-]{0,40}\b(polic(y|ies)|handbook|guideline|sop)\b/i.test(message) ||
    /\b(polic(y|ies)|handbook|guideline|sop)\b[\s\w-]{0,40}\b(leave|holiday)\b/i.test(message) ||
    /\bwhat (is|are)\b[\s\w-]{0,40}\bleave\b[\s\w-]{0,20}\bpolic/i.test(message) ||
    /\bexplain\b[\s\w-]{0,40}\bleave\b[\s\w-]{0,20}\bpolic/i.test(message)
  );
}

export function isLeaveRelatedMessage(message: string): boolean {
  if (isLeavePolicyKnowledgeQuestion(message)) {
    return false;
  }
  return (
    detectLeaveIntent(message) !== null ||
    /\bleave\b/i.test(message) ||
    /\bholiday/i.test(message) ||
    /\bcausal\b|\bcasual\b|\bsick\b|\bannual\b/i.test(message)
  );
}
