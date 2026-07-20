/** String permission catalog — never integer codes. */
export const PERMISSIONS = {
  EMPLOYEE_READ: 'employee.read',
  EMPLOYEE_UPDATE: 'employee.update',
  LEAVE_APPLY: 'leave.apply',
  LEAVE_APPROVE: 'leave.approve',
  LEAVE_CANCEL: 'leave.cancel',
  ATTENDANCE_VIEW: 'attendance.view',
  ATTENDANCE_REGULARIZE: 'attendance.regularize',
  PAYROLL_VIEW: 'payroll.view',
  KNOWLEDGE_SEARCH: 'knowledge.search',
  KNOWLEDGE_UPLOAD: 'knowledge.upload',
  ADMIN_USER_MANAGE: 'admin.user.manage',
  ADMIN_ROLE_MANAGE: 'admin.role.manage',
  ADMIN_AUDIT_READ: 'admin.audit.read',
  MCP_EXECUTE: 'mcp.execute',
  WORKFLOW_EXECUTE: 'workflow.execute',
  RBAC_ROLE_READ: 'rbac.role.read',
  RBAC_PERMISSION_READ: 'rbac.permission.read',
  TENANT_READ: 'tenant.read',
  AUTH_SESSION_REVOKE: 'auth.session.revoke',
  AI_CHAT: 'ai.chat',
  AI_PLAN: 'ai.plan',
  AI_AGENTS_READ: 'ai.agents.read',
  AI_TOOLS_READ: 'ai.tools.read',
  AI_MODELS_READ: 'ai.models.read',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_HIERARCHY: Record<string, number> = {
  Employee: 10,
  Manager: 20,
  Recruiter: 30,
  LearningAdmin: 30,
  IT: 40,
  Finance: 40,
  HR: 50,
  SystemAdmin: 80,
  SuperAdmin: 100,
};

export function roleAtLeast(role: string, minimum: string): boolean {
  return (ROLE_HIERARCHY[role] ?? 0) >= (ROLE_HIERARCHY[minimum] ?? Number.MAX_SAFE_INTEGER);
}
