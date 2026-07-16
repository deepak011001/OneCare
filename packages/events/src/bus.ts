export interface DomainEvent<TPayload = Readonly<Record<string, unknown>>> {
  readonly name: string;
  readonly occurredAt: Date;
  readonly tenantId?: string | undefined;
  readonly correlationId?: string | undefined;
  readonly payload: TPayload;
}

export interface EventBusPort {
  publish<T>(event: DomainEvent<T>): Promise<void>;
  subscribe(eventName: string, handler: (event: DomainEvent) => Promise<void>): void;
}

export class InProcessEventBus implements EventBusPort {
  private readonly handlers = new Map<string, Array<(event: DomainEvent) => Promise<void>>>();

  subscribe(eventName: string, handler: (event: DomainEvent) => Promise<void>): void {
    const list = this.handlers.get(eventName) ?? [];
    list.push(handler);
    this.handlers.set(eventName, list);
  }

  async publish<T>(event: DomainEvent<T>): Promise<void> {
    const list = this.handlers.get(event.name) ?? [];
    for (const handler of list) {
      await handler(event as DomainEvent);
    }
  }
}

export const DOMAIN_EVENTS = {
  USER_LOGGED_IN: 'UserLoggedIn',
  USER_LOGGED_OUT: 'UserLoggedOut',
  SESSION_CREATED: 'SessionCreated',
  SESSION_REVOKED: 'SessionRevoked',
  TOKEN_REFRESHED: 'TokenRefreshed',
  TOKEN_REUSE_DETECTED: 'TokenReuseDetected',
  AUDIT_WRITTEN: 'AuditWritten',
  PERMISSION_DENIED: 'PermissionDenied',
} as const;
