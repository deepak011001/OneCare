export const AUDIT_ACTIONS = {
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  TOKEN_REFRESH: 'auth.token.refresh',
  TOKEN_REUSE_DETECTED: 'auth.token.reuse_detected',
  SESSION_REVOKED: 'auth.session.revoked',
  PERMISSION_DENIED: 'authz.permission_denied',
  ROLE_ASSIGNED: 'rbac.role.assigned',
  PERMISSION_CHANGED: 'rbac.permission.changed',
  PROFILE_UPDATED: 'user.profile.updated',
  TENANT_CREATED: 'tenant.created',
  AI_CHAT: 'ai.chat',
  AI_PLAN: 'ai.plan',
  AI_STREAM: 'ai.stream',
  MCP_TOOL_EXECUTE: 'mcp.tool.execute',
  LEAVE_BALANCE_VIEW: 'leave.balance.view',
  LEAVE_HISTORY_VIEW: 'leave.history.view',
  LEAVE_READ: 'leave.read',
  LEAVE_VIEW_DENIED: 'leave.view.denied',
  LEAVE_APPLY: 'leave.apply',
  LEAVE_CANCEL: 'leave.cancel',
  LEAVE_CONFIRMATION_REJECTED: 'leave.confirmation.rejected',
  ATTENDANCE_VIEW: 'attendance.view',
  ATTENDANCE_CLOCK_IN: 'attendance.clock_in',
  ATTENDANCE_CLOCK_OUT: 'attendance.clock_out',
  ATTENDANCE_REGULARIZE: 'attendance.regularize',
  ATTENDANCE_VIEW_DENIED: 'attendance.view.denied',
  ATTENDANCE_CONFIRMATION_REJECTED: 'attendance.confirmation.rejected',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export type AuditResult = 'success' | 'failure' | 'denied';
