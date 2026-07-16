import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hashToken, generateOpaqueToken } from '@onecare/security';
import { RbacPermissionChecker } from '@onecare/auth';
import { PERMISSIONS } from '@onecare/auth';
import { asTenantId, asUserId } from '@onecare/shared';

describe('M1 security primitives', () => {
  it('hashes refresh tokens uniquely', () => {
    const a = generateOpaqueToken();
    const b = generateOpaqueToken();
    assert.notEqual(a, b);
    assert.equal(hashToken(a).length, 64);
  });

  it('enforces RBAC deny-by-default', () => {
    const checker = new RbacPermissionChecker();
    const principal = {
      userId: asUserId('11111111-1111-1111-1111-111111111111'),
      tenantId: asTenantId('22222222-2222-2222-2222-222222222222'),
      sessionId: '33333333-3333-3333-3333-333333333333',
      email: 'e@x.com',
      displayName: 'E',
      roles: ['Employee'],
      permissions: [PERMISSIONS.LEAVE_APPLY],
      attributes: {},
      mfaCompleted: true,
    };
    assert.equal(checker.hasPermission(principal, PERMISSIONS.LEAVE_APPLY), true);
    assert.equal(checker.hasPermission(principal, PERMISSIONS.ADMIN_AUDIT_READ), false);
  });
});
