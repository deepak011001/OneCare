import type { TenantId, UserId } from '@onecare/shared';
import { ForbiddenError } from '@onecare/shared';
import type { PermissionCode } from './permissions';

/** Product roles — permission matrices live in DB. */
export const SYSTEM_ROLES = [
  'Employee',
  'Manager',
  'HR',
  'Finance',
  'IT',
  'Recruiter',
  'LearningAdmin',
  'SystemAdmin',
  'SuperAdmin',
] as const;

export type SystemRole = (typeof SYSTEM_ROLES)[number];

export interface AuthPrincipal {
  readonly userId: UserId;
  readonly tenantId: TenantId;
  readonly sessionId: string;
  readonly email: string;
  readonly displayName: string;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
  readonly organizationId?: string;
  readonly departmentId?: string;
  readonly attributes: Readonly<Record<string, unknown>>;
  readonly mfaCompleted: boolean;
}

export interface PermissionChecker {
  hasPermission(principal: AuthPrincipal, permission: string): boolean;
  hasAny(principal: AuthPrincipal, permissions: readonly string[]): boolean;
  hasAll(principal: AuthPrincipal, permissions: readonly string[]): boolean;
}

export class RbacPermissionChecker implements PermissionChecker {
  hasPermission(principal: AuthPrincipal, permission: string): boolean {
    if (principal.roles.includes('SuperAdmin')) {
      return true;
    }
    return principal.permissions.includes(permission);
  }

  hasAny(principal: AuthPrincipal, permissions: readonly string[]): boolean {
    return permissions.some((p) => this.hasPermission(principal, p));
  }

  hasAll(principal: AuthPrincipal, permissions: readonly string[]): boolean {
    return permissions.every((p) => this.hasPermission(principal, p));
  }
}

export function assertPermission(
  checker: PermissionChecker,
  principal: AuthPrincipal,
  permission: PermissionCode | string,
): void {
  if (!checker.hasPermission(principal, permission)) {
    throw new ForbiddenError(`Missing permission: ${permission}`);
  }
}

/** ABAC hook — evaluate attributes; full policy engine comes later. */
export interface AbacPolicyPort {
  evaluate(input: {
    readonly principal: AuthPrincipal;
    readonly action: string;
    readonly resource?: Readonly<Record<string, unknown>>;
  }): Promise<{ allowed: boolean; reason?: string }>;
}

export class AllowAbacPolicyPort implements AbacPolicyPort {
  async evaluate(): Promise<{ allowed: boolean }> {
    return { allowed: true };
  }
}
