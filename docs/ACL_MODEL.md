# OneCare — Knowledge ACL Model

**Related:** [`SECURITY.md`](./SECURITY.md) · [`ENTERPRISE_KNOWLEDGE_PLATFORM.md`](./ENTERPRISE_KNOWLEDGE_PLATFORM.md)

## Envelope

Every document/chunk carries `DocumentAcl`:

- `tenantId` (mandatory)
- `visibility`: `public` | `private` | `restricted`
- optional: organizationIds, departmentIds, roles, securityGroups, entraGroupIds, ownerUserIds

## Evaluation

1. Different tenant → deny
2. `public` → allow (within tenant)
3. `private` → ownerUserIds must include principal
4. `restricted` → principal must match **at least one** explicitly set constraint

Search and vector branches both call `AclResolverPort.isAllowed` before returning hits.

## Audit

Admin sync/search diagnostics write `knowledge.sync` / `knowledge.admin` audit actions. Employee search continues to use `knowledge.search`.
