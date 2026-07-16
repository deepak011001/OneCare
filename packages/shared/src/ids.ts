export type Brand<T, B extends string> = T & { readonly __brand: B };

export type TenantId = Brand<string, 'TenantId'>;
export type UserId = Brand<string, 'UserId'>;
export type CorrelationId = Brand<string, 'CorrelationId'>;

export function asTenantId(value: string): TenantId {
  return value as TenantId;
}

export function asUserId(value: string): UserId {
  return value as UserId;
}

export function asCorrelationId(value: string): CorrelationId {
  return value as CorrelationId;
}
