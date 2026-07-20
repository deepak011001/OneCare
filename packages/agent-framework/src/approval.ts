import { randomUUID } from 'node:crypto';
import type { ApprovalRequest, ApprovalStatus } from './types';

export interface ApprovalPort {
  create(
    input: Omit<ApprovalRequest, 'id' | 'status' | 'createdAt'> & {
      readonly status?: ApprovalStatus;
    },
  ): Promise<ApprovalRequest>;
  get(id: string): Promise<ApprovalRequest | null>;
  decide(
    id: string,
    decision: 'approved' | 'rejected',
    actorUserId: string,
  ): Promise<ApprovalRequest>;
  escalate(id: string, escalatedTo: string): Promise<ApprovalRequest>;
  delegate(id: string, delegatedTo: string): Promise<ApprovalRequest>;
  expireDue(now?: Date): Promise<readonly ApprovalRequest[]>;
  list(tenantId: string): Promise<readonly ApprovalRequest[]>;
}

/** Approval abstractions only — business workflows come in later milestones. */
export class InMemoryApprovalStore implements ApprovalPort {
  private readonly byId = new Map<string, ApprovalRequest>();

  async create(
    input: Omit<ApprovalRequest, 'id' | 'status' | 'createdAt'> & {
      readonly status?: ApprovalStatus;
    },
  ): Promise<ApprovalRequest> {
    const item: ApprovalRequest = {
      id: randomUUID(),
      tenantId: input.tenantId,
      agentId: input.agentId,
      requesterUserId: input.requesterUserId,
      approverUserIds: input.approverUserIds,
      action: input.action,
      payload: input.payload,
      status: input.status ?? 'pending',
      createdAt: new Date().toISOString(),
      ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
      ...(input.delegatedTo ? { delegatedTo: input.delegatedTo } : {}),
      ...(input.escalatedTo ? { escalatedTo: input.escalatedTo } : {}),
    };
    this.byId.set(item.id, item);
    return item;
  }

  async get(id: string) {
    return this.byId.get(id) ?? null;
  }

  async decide(id: string, decision: 'approved' | 'rejected', _actorUserId: string) {
    const item = this.byId.get(id);
    if (!item) throw new Error(`Approval not found: ${id}`);
    const next = { ...item, status: decision };
    this.byId.set(id, next);
    return next;
  }

  async escalate(id: string, escalatedTo: string) {
    const item = this.byId.get(id);
    if (!item) throw new Error(`Approval not found: ${id}`);
    const next = { ...item, status: 'escalated' as const, escalatedTo };
    this.byId.set(id, next);
    return next;
  }

  async delegate(id: string, delegatedTo: string) {
    const item = this.byId.get(id);
    if (!item) throw new Error(`Approval not found: ${id}`);
    const next = { ...item, status: 'delegated' as const, delegatedTo };
    this.byId.set(id, next);
    return next;
  }

  async expireDue(now = new Date()) {
    const expired: ApprovalRequest[] = [];
    for (const [id, item] of this.byId) {
      if (item.status !== 'pending' || !item.expiresAt) continue;
      if (Date.parse(item.expiresAt) <= now.getTime()) {
        const next = { ...item, status: 'expired' as const };
        this.byId.set(id, next);
        expired.push(next);
      }
    }
    return expired;
  }

  async list(tenantId: string) {
    return [...this.byId.values()].filter((a) => a.tenantId === tenantId);
  }
}
