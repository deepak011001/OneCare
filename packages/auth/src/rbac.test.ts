import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { asTenantId, asUserId } from '@onecare/shared';
import { PERMISSIONS } from './permissions';
import { RbacPermissionChecker, type AuthPrincipal } from './rbac';

function principal(overrides: Partial<AuthPrincipal> = {}): AuthPrincipal {
  return {
    userId: asUserId('11111111-1111-1111-1111-111111111111'),
    tenantId: asTenantId('22222222-2222-2222-2222-222222222222'),
    sessionId: '33333333-3333-3333-3333-333333333333',
    email: 'user@example.com',
    displayName: 'User',
    roles: ['Employee'],
    permissions: [PERMISSIONS.LEAVE_APPLY],
    attributes: {},
    mfaCompleted: false,
    ...overrides,
  };
}

describe('RbacPermissionChecker', () => {
  const checker = new RbacPermissionChecker();

  it('allows listed permissions', () => {
    assert.equal(checker.hasPermission(principal(), PERMISSIONS.LEAVE_APPLY), true);
    assert.equal(checker.hasPermission(principal(), PERMISSIONS.LEAVE_APPROVE), false);
  });

  it('grants SuperAdmin all permissions', () => {
    assert.equal(
      checker.hasPermission(
        principal({ roles: ['SuperAdmin'], permissions: [] }),
        PERMISSIONS.ADMIN_AUDIT_READ,
      ),
      true,
    );
  });
});
