import { randomUUID } from 'node:crypto';
import type { TenantId, UserId } from '@onecare/shared';

export type ConfirmationStatus = 'pending' | 'approved' | 'cancelled' | 'expired';

export interface ConfirmationRequest {
  readonly id: string;
  readonly tenantId: TenantId;
  readonly userId: UserId;
  readonly connectorId: string;
  readonly toolName: string;
  readonly arguments: Readonly<Record<string, unknown>>;
  readonly summary: string;
  readonly status: ConfirmationStatus;
  readonly createdAt: Date;
  readonly expiresAt: Date;
}

export interface CreateConfirmationInput {
  readonly tenantId: TenantId;
  readonly userId: UserId;
  readonly connectorId: string;
  readonly toolName: string;
  readonly arguments: Readonly<Record<string, unknown>>;
  readonly summary: string;
  readonly ttlMs?: number;
}

export interface ConfirmationStorePort {
  create(input: CreateConfirmationInput): Promise<ConfirmationRequest>;
  get(tenantId: TenantId, id: string): Promise<ConfirmationRequest | null>;
  approve(tenantId: TenantId, id: string, userId: UserId): Promise<ConfirmationRequest | null>;
  cancel(tenantId: TenantId, id: string, userId: UserId): Promise<ConfirmationRequest | null>;
}

export class InMemoryConfirmationStore implements ConfirmationStorePort {
  private readonly store = new Map<string, ConfirmationRequest>();

  async create(input: CreateConfirmationInput): Promise<ConfirmationRequest> {
    const id = randomUUID();
    const now = new Date();
    const ttl = input.ttlMs ?? 15 * 60_000;
    const request: ConfirmationRequest = {
      id,
      tenantId: input.tenantId,
      userId: input.userId,
      connectorId: input.connectorId,
      toolName: input.toolName,
      arguments: input.arguments,
      summary: input.summary,
      status: 'pending',
      createdAt: now,
      expiresAt: new Date(now.getTime() + ttl),
    };
    this.store.set(this.key(input.tenantId, id), request);
    return request;
  }

  async get(tenantId: TenantId, id: string): Promise<ConfirmationRequest | null> {
    const item = this.store.get(this.key(tenantId, id));
    if (!item) return null;
    if (item.status === 'pending' && item.expiresAt.getTime() < Date.now()) {
      const expired = { ...item, status: 'expired' as const };
      this.store.set(this.key(tenantId, id), expired);
      return expired;
    }
    return item;
  }

  async approve(
    tenantId: TenantId,
    id: string,
    userId: UserId,
  ): Promise<ConfirmationRequest | null> {
    const item = await this.get(tenantId, id);
    if (!item || item.status !== 'pending') return null;
    if (String(item.userId) !== String(userId)) return null;
    const approved = { ...item, status: 'approved' as const };
    this.store.set(this.key(tenantId, id), approved);
    return approved;
  }

  async cancel(
    tenantId: TenantId,
    id: string,
    userId: UserId,
  ): Promise<ConfirmationRequest | null> {
    const item = await this.get(tenantId, id);
    if (!item || item.status !== 'pending') return null;
    if (String(item.userId) !== String(userId)) return null;
    const cancelled = { ...item, status: 'cancelled' as const };
    this.store.set(this.key(tenantId, id), cancelled);
    return cancelled;
  }

  private key(tenantId: TenantId, id: string): string {
    return `${String(tenantId)}:${id}`;
  }
}

export function buildConfirmationSummary(toolName: string, args: Readonly<Record<string, unknown>>): string {
  return `Confirm execution of ${toolName} with ${JSON.stringify(args)}`;
}
