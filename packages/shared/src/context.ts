import type { CorrelationId, TenantId, UserId } from './ids';

export type SessionId = string & { readonly __brand: 'SessionId' };
export type RequestId = string & { readonly __brand: 'RequestId' };
export type TraceId = string & { readonly __brand: 'TraceId' };

export function asSessionId(value: string): SessionId {
  return value as SessionId;
}

export function asRequestId(value: string): RequestId {
  return value as RequestId;
}

export function asTraceId(value: string): TraceId {
  return value as TraceId;
}

/**
 * Gateway-ready request context — populated by middleware before controllers.
 * Tenant/User always come from authenticated session, never from client headers for isolation.
 */
export interface RequestContext {
  readonly correlationId: CorrelationId;
  readonly requestId: RequestId;
  readonly traceId: TraceId;
  readonly tenantId: TenantId;
  readonly userId: UserId;
  readonly sessionId: SessionId;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
  readonly organizationId?: string;
  readonly departmentId?: string;
  readonly ip?: string;
  readonly userAgent?: string;
  readonly attributes: Readonly<Record<string, unknown>>;
}

/** Partial context available before authentication completes. */
export interface AnonymousRequestContext {
  readonly correlationId: CorrelationId;
  readonly requestId: RequestId;
  readonly traceId: TraceId;
  readonly ip?: string;
  readonly userAgent?: string;
}
