import { createHash } from 'node:crypto';
import type { AclPrincipal, DocumentAcl, KnowledgeSourceConfig, ConnectorDocument } from './types';
import type { AclResolverPort } from './ports';

export function createFingerprint(parts: readonly string[]): string {
  return createHash('sha256').update(parts.join('\u0000')).digest('hex');
}

export function isAclAllowed(acl: DocumentAcl, principal: AclPrincipal): boolean {
  if (acl.tenantId !== principal.tenantId) {
    return false;
  }

  if (acl.visibility === 'public') {
    return true;
  }

  if (acl.visibility === 'private') {
    if (!principal.userId || !acl.ownerUserIds?.length) return false;
    return acl.ownerUserIds.includes(principal.userId);
  }

  // restricted — must match at least one explicitly set constraint
  const checks: boolean[] = [];
  if (acl.organizationIds?.length) {
    checks.push(
      principal.organizationId !== undefined &&
        acl.organizationIds.includes(principal.organizationId),
    );
  }
  if (acl.departmentIds?.length) {
    checks.push(
      principal.departmentId !== undefined && acl.departmentIds.includes(principal.departmentId),
    );
  }
  if (acl.roles?.length) {
    checks.push(principal.roles?.some((r) => acl.roles!.includes(r)) ?? false);
  }
  if (acl.securityGroups?.length) {
    checks.push(principal.securityGroups?.some((g) => acl.securityGroups!.includes(g)) ?? false);
  }
  if (acl.entraGroupIds?.length) {
    checks.push(principal.entraGroupIds?.some((g) => acl.entraGroupIds!.includes(g)) ?? false);
  }
  if (acl.ownerUserIds?.length) {
    checks.push(principal.userId !== undefined && acl.ownerUserIds.includes(principal.userId));
  }

  if (checks.length === 0) {
    return true;
  }
  return checks.some(Boolean);
}

export class DefaultAclResolver implements AclResolverPort {
  resolve(input: {
    readonly tenantId: string;
    readonly source: KnowledgeSourceConfig;
    readonly document: ConnectorDocument;
  }): DocumentAcl {
    const opts = input.source.options ?? {};
    const visibility =
      opts['visibility'] === 'private' || opts['visibility'] === 'restricted'
        ? opts['visibility']
        : 'public';

    return {
      tenantId: input.tenantId,
      visibility,
      ...(typeof opts['organizationId'] === 'string'
        ? { organizationIds: [opts['organizationId']] }
        : {}),
      ...(typeof opts['departmentId'] === 'string'
        ? { departmentIds: [opts['departmentId']] }
        : {}),
      ...(Array.isArray(opts['roles'])
        ? { roles: opts['roles'].filter((r): r is string => typeof r === 'string') }
        : {}),
      ...(input.document.owner ? { ownerUserIds: [input.document.owner] } : {}),
    };
  }

  isAllowed(acl: DocumentAcl, principal: AclPrincipal): boolean {
    return isAclAllowed(acl, principal);
  }
}
