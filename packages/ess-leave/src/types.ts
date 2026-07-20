export type LeaveIntent =
  | 'employee.leave.balance'
  | 'employee.leave.history'
  | 'employee.leave.apply'
  | 'employee.leave.cancel'
  | 'employee.leave.types'
  | 'employee.leave.holidays'
  | 'employee.leave.status'
  | 'employee.leave.enough';

export type LeaveToolName =
  'leaveBalance' | 'leaveHistory' | 'applyLeave' | 'cancelLeave' | 'leaveTypes' | 'holidayCalendar';

export interface LeaveSlots {
  readonly startDate?: string;
  readonly endDate?: string;
  readonly leaveType?: string;
  readonly halfDay?: boolean;
  readonly reason?: string;
  readonly requestId?: string;
  readonly durationDays?: number;
  readonly statusFilter?: string;
}

export interface LeaveBalanceItem {
  readonly leaveType: string;
  readonly available: number;
  readonly used?: number;
}

export interface HolidayItem {
  readonly date: string;
  readonly name: string;
}

export interface LeaveValidationIssue {
  readonly code: string;
  readonly message: string;
  readonly field?: string;
}

export type LeaveCapabilityOutcome =
  | {
      readonly kind: 'clarify';
      readonly intent: LeaveIntent;
      readonly question: string;
      readonly missing: readonly string[];
      readonly slots: LeaveSlots;
      readonly suggestedReplies?: readonly string[];
    }
  | {
      readonly kind: 'ready';
      readonly intent: LeaveIntent;
      readonly toolName: LeaveToolName;
      readonly arguments: Readonly<Record<string, unknown>>;
      readonly slots: LeaveSlots;
      readonly confirmationSummary?: string;
      readonly requiresConfirmation: boolean;
    }
  | {
      readonly kind: 'invalid';
      readonly intent: LeaveIntent;
      readonly message: string;
      readonly issues: readonly LeaveValidationIssue[];
      readonly suggestedReplies?: readonly string[];
    }
  | {
      readonly kind: 'unsupported';
      readonly message: string;
    };

export interface LeaveCapabilityInput {
  readonly message: string;
  readonly priorSlots?: LeaveSlots;
  readonly now?: Date;
  readonly balances?: readonly LeaveBalanceItem[];
  readonly holidays?: readonly HolidayItem[];
  readonly leaveTypes?: readonly string[];
}
