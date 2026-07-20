export type AttendanceIntent =
  | 'employee.attendance.today'
  | 'employee.attendance.history'
  | 'employee.attendance.summary'
  | 'employee.attendance.clock_in'
  | 'employee.attendance.clock_out'
  | 'employee.attendance.regularize'
  | 'employee.attendance.shift'
  | 'employee.attendance.hours'
  | 'employee.attendance.late'
  | 'employee.attendance.absent'
  | 'employee.attendance.wfh';

export type AttendanceToolName =
  | 'attendanceToday'
  | 'attendanceHistory'
  | 'attendanceSummary'
  | 'clockIn'
  | 'clockOut'
  | 'attendanceRegularization'
  | 'shiftSchedule'
  | 'workingHours';

export interface AttendanceSlots {
  readonly date?: string;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly halfDay?: boolean;
  readonly shift?: string;
  readonly location?: string;
  readonly reason?: string;
  readonly statusFilter?: string;
}

export interface AttendanceTodaySnapshot {
  readonly date: string;
  readonly status: 'checked_in' | 'checked_out' | 'absent' | 'not_started' | 'holiday' | 'weekend';
  readonly checkInAt?: string;
  readonly checkOutAt?: string;
  readonly workingHours?: number;
  readonly late?: boolean;
  readonly wfh?: boolean;
}

export interface AttendanceValidationIssue {
  readonly code: string;
  readonly message: string;
  readonly field?: string;
}

export type AttendanceCapabilityOutcome =
  | {
      readonly kind: 'clarify';
      readonly intent: AttendanceIntent;
      readonly question: string;
      readonly missing: readonly string[];
      readonly slots: AttendanceSlots;
      readonly suggestedReplies?: readonly string[];
    }
  | {
      readonly kind: 'ready';
      readonly intent: AttendanceIntent;
      readonly toolName: AttendanceToolName;
      readonly arguments: Readonly<Record<string, unknown>>;
      readonly slots: AttendanceSlots;
      readonly confirmationSummary?: string;
      readonly requiresConfirmation: boolean;
    }
  | {
      readonly kind: 'invalid';
      readonly intent: AttendanceIntent;
      readonly message: string;
      readonly issues: readonly AttendanceValidationIssue[];
      readonly suggestedReplies?: readonly string[];
    }
  | {
      readonly kind: 'unsupported';
      readonly message: string;
    };

export interface AttendanceCapabilityInput {
  readonly message: string;
  readonly priorSlots?: AttendanceSlots;
  readonly now?: Date;
  readonly today?: AttendanceTodaySnapshot;
  readonly holidays?: readonly string[];
}
