export interface WriteAuditInput {
  readonly tenantId?: string | undefined;
  readonly userId?: string | undefined;
  readonly sessionId?: string | undefined;
  readonly action: string;
  readonly resource?: string | undefined;
  readonly resourceId?: string | undefined;
  readonly result: 'success' | 'failure' | 'denied';
  readonly ip?: string | undefined;
  readonly userAgent?: string | undefined;
  readonly requestId?: string | undefined;
  readonly correlationId?: string | undefined;
  readonly metadata?: Readonly<Record<string, unknown>> | undefined;
}
