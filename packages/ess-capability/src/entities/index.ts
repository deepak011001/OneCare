import type { EntityDeclaration } from '../types';

export * from './extractors';

/** Common reusable entity declarations for Employee capabilities. */
export const CommonEntities = {
  startDate: {
    id: 'startDate',
    kind: 'date',
    slotKey: 'startDate',
    label: 'Start date',
    clarifyQuestion: 'Which date should I use?',
    suggestedReplies: ['Tomorrow', 'Next Friday', 'Monday to Wednesday'],
  },
  endDate: {
    id: 'endDate',
    kind: 'date',
    slotKey: 'endDate',
    label: 'End date',
  },
  dateRange: {
    id: 'dateRange',
    kind: 'relativeDate',
    slotKey: 'dateRange',
    label: 'Date range',
    clarifyQuestion: 'Which date should I use?',
    suggestedReplies: ['Tomorrow', 'Next Friday', 'Monday to Wednesday'],
  },
  leaveType: {
    id: 'leaveType',
    kind: 'leaveType',
    slotKey: 'leaveType',
    label: 'Leave type',
    clarifyQuestion: 'Which leave type should I apply?',
    suggestedReplies: ['Casual', 'Sick', 'Annual'],
  },
  reason: {
    id: 'reason',
    kind: 'reason',
    slotKey: 'reason',
    label: 'Reason',
    clarifyQuestion: 'What reason should I include?',
    suggestedReplies: ['Personal', 'Family function', 'Medical'],
  },
  halfDay: {
    id: 'halfDay',
    kind: 'halfDay',
    slotKey: 'halfDay',
    label: 'Half day',
  },
  requestId: {
    id: 'requestId',
    kind: 'requestId',
    slotKey: 'requestId',
    label: 'Request id',
    clarifyQuestion: 'Which request id should I use?',
    suggestedReplies: ['Show my leave history'],
  },
  amount: {
    id: 'amount',
    kind: 'amount',
    slotKey: 'amount',
    label: 'Amount',
    clarifyQuestion: 'What amount?',
  },
  ticket: {
    id: 'ticket',
    kind: 'ticket',
    slotKey: 'ticketId',
    label: 'Ticket',
    clarifyQuestion: 'Which ticket id?',
  },
} as const satisfies Record<string, EntityDeclaration>;
