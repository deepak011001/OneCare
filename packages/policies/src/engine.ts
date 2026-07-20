import type { TenantId, UserId } from '@onecare/shared';

export type PolicyDecision = 'allow' | 'deny' | 'require_confirmation';

export interface PolicyEvaluationContext {
  readonly tenantId: TenantId;
  readonly userId: UserId;
  readonly toolName: string;
  readonly connectorId: string;
  readonly permissions: readonly string[];
  readonly requiredPermissions: readonly string[];
  readonly confirmationRequired: boolean;
  readonly confirmationApproved: boolean;
  readonly now?: Date;
  readonly tenantPolicy?: TenantExecutionPolicy;
}

export interface TenantExecutionPolicy {
  readonly businessHoursOnly?: boolean;
  readonly timezone?: string;
  readonly businessHourStart?: number;
  readonly businessHourEnd?: number;
  readonly rateLimitPerMinute?: number;
}

export interface PolicyEvaluationResult {
  readonly decision: PolicyDecision;
  readonly reasons: readonly string[];
}

export interface ExecutionPolicy {
  readonly id: string;
  evaluate(context: PolicyEvaluationContext): PolicyEvaluationResult;
}

export class PermissionPolicy implements ExecutionPolicy {
  readonly id = 'permission';

  evaluate(context: PolicyEvaluationContext): PolicyEvaluationResult {
    const missing = context.requiredPermissions.filter(
      (p) => !context.permissions.includes(p),
    );
    if (missing.length > 0) {
      return {
        decision: 'deny',
        reasons: [`Missing permissions: ${missing.join(', ')}`],
      };
    }
    return { decision: 'allow', reasons: [] };
  }
}

export class BusinessHoursPolicy implements ExecutionPolicy {
  readonly id = 'business_hours';

  evaluate(context: PolicyEvaluationContext): PolicyEvaluationResult {
    const policy = context.tenantPolicy;
    if (!policy?.businessHoursOnly) {
      return { decision: 'allow', reasons: [] };
    }
    const now = context.now ?? new Date();
    const hour = now.getUTCHours();
    const start = policy.businessHourStart ?? 9;
    const end = policy.businessHourEnd ?? 18;
    if (hour < start || hour >= end) {
      return {
        decision: 'deny',
        reasons: ['Tool execution is restricted to business hours for this tenant'],
      };
    }
    return { decision: 'allow', reasons: [] };
  }
}

export class ConfirmationPolicy implements ExecutionPolicy {
  readonly id = 'confirmation';

  evaluate(context: PolicyEvaluationContext): PolicyEvaluationResult {
    if (!context.confirmationRequired) {
      return { decision: 'allow', reasons: [] };
    }
    if (context.confirmationApproved) {
      return { decision: 'allow', reasons: [] };
    }
    return {
      decision: 'require_confirmation',
      reasons: ['User confirmation required before executing this tool'],
    };
  }
}

export class RateLimitPolicy implements ExecutionPolicy {
  readonly id = 'rate_limit';
  private readonly counters = new Map<string, { count: number; windowStart: number }>();

  evaluate(context: PolicyEvaluationContext): PolicyEvaluationResult {
    const limit = context.tenantPolicy?.rateLimitPerMinute;
    if (!limit) {
      return { decision: 'allow', reasons: [] };
    }
    const key = `${String(context.tenantId)}:${context.toolName}`;
    const now = Date.now();
    const windowMs = 60_000;
    const entry = this.counters.get(key);
    if (!entry || now - entry.windowStart >= windowMs) {
      this.counters.set(key, { count: 1, windowStart: now });
      return { decision: 'allow', reasons: [] };
    }
    if (entry.count >= limit) {
      return { decision: 'deny', reasons: ['Rate limit exceeded for this tool'] };
    }
    entry.count += 1;
    return { decision: 'allow', reasons: [] };
  }
}

export class PolicyEngine {
  constructor(private readonly policies: readonly ExecutionPolicy[] = []) {}

  evaluate(context: PolicyEvaluationContext): PolicyEvaluationResult {
    const reasons: string[] = [];
    for (const policy of this.policies) {
      const result = policy.evaluate(context);
      reasons.push(...result.reasons);
      if (result.decision === 'deny') {
        return { decision: 'deny', reasons };
      }
      if (result.decision === 'require_confirmation') {
        return { decision: 'require_confirmation', reasons };
      }
    }
    return { decision: 'allow', reasons };
  }
}

export function createDefaultPolicyEngine(): PolicyEngine {
  return new PolicyEngine([
    new PermissionPolicy(),
    new BusinessHoursPolicy(),
    new ConfirmationPolicy(),
    new RateLimitPolicy(),
  ]);
}
